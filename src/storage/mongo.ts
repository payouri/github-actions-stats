import mongoose, {
  type ClientSession,
  type Document,
  type IndexDefinition,
  type IndexOptions,
  type Mixed,
} from "mongoose";
import type { Logger } from "winston";
import defaultLogger from "../lib/Logger/logger.js";
import type { Storage } from "./types.js";
import type { OverrideMethods } from "../types/OverrideMethods.js";
import type { AnyZodObject, z } from "zod";
import dayjs from "dayjs";

const { connection, ConnectionStates, Schema } = mongoose;
mongoose.set("strictQuery", false);
mongoose.set("strict", false);

type DocumentWithKey<T> = T & {
  key: string;
} & Document;

export type MongoStorage<Result> = OverrideMethods<
  Storage<Result>,
  {
    setMany(
      data: Parameters<Storage<Result>["setMany"]>[0],
      options?: { session?: ClientSession }
    ): Promise<void>;
    set: (
      key: Parameters<Storage<Result>["set"]>[0],
      value: Parameters<Storage<Result>["set"]>[1],
      options?: { session?: ClientSession }
    ) => Promise<void>;
    delete: (
      key: Parameters<Storage<Result>["delete"]>[0],
      options?: { session?: ClientSession }
    ) => Promise<void>;
    get: (
      key: Parameters<Storage<Result>["get"]>[0],
      options?: { session?: ClientSession }
    ) => Promise<Result | null>;
    query: (
      query: {
        workflowName: string;
        repositoryName: string;
        repositoryOwner: string;
        branchName?: string;
        ranAt?: {
          min: Date;
          max: Date;
        };
        status?: string;
      },
      options?: { session?: ClientSession; limit?: number }
    ) => Promise<Result[]>;
  }
>;
export async function createMongoStorage<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>
>(params: {
  collectionName: string;
  dbURI: string;
  indexes: [IndexDefinition, IndexOptions][];
  schema: Schema;
  logger?: Logger;
}): Promise<
  MongoStorage<Result> & {
    startTransaction: () => Promise<ClientSession | undefined>;
  }
> {
  const { schema, collectionName, dbURI, logger = defaultLogger } = params;

  if (connection.readyState !== ConnectionStates.connected) {
    if (connection.readyState === ConnectionStates.connecting) {
      logger.debug("Waiting for MongoDB to connect");
      await connection.asPromise();
    } else if (
      [ConnectionStates.disconnected, ConnectionStates.disconnecting].includes(
        connection.readyState
      )
    ) {
      while (connection.readyState !== ConnectionStates.disconnected) {
        logger.debug("Waiting for MongoDB to disconnect");
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      logger.debug("Opening MongoDB connection");
      await connection.openUri(dbURI);
    } else if (connection.readyState === ConnectionStates.uninitialized) {
      logger.debug("Opening MongoDB connection");
      await connection.openUri(dbURI);
    }
  }
  logger.debug("MongoDB connection is open");

  if (!connection.db) {
    throw new Error("MongoDB connection is not open");
  }

  const mongooseSchema = new Schema<DocumentWithKey<Result>>(
    {
      ...Object.entries(schema.shape).reduce<
        Record<string, { type: typeof Schema.Types.Mixed }>
      >((acc, [fieldName]) => {
        acc[fieldName] = {
          type: Schema.Types.Mixed,
        };
        return acc;
      }, {}),
      key: {
        type: String,
        required: true,
        unique: true,
      },
    },
    {
      autoIndex: true,
      timestamps: true,
      strict: true,
    }
  );
  const model = connection.model<DocumentWithKey<Result>>(
    collectionName,
    mongooseSchema,
    collectionName
  );
  for (const [index, options] of params.indexes) {
    mongooseSchema.index(index, options);
  }
  await model.syncIndexes(
    connection.db.writeConcern
      ? {
          background: true,
        }
      : {}
  );

  async function get(key: string): Promise<Result | null> {
    logger.debug(`Getting data for key ${key}`);
    const time = performance.now();
    const result = await model
      .findOne({
        key: {
          $eq: key,
        },
      })
      .setOptions({
        lean: true,
      })
      .exec();
    const endTime = performance.now();
    logger.debug(`Data for key ${key} has been fetched in ${endTime - time}ms`);
    if (!result) return null;

    return result;
  }

  async function set(key: string, value: Result): Promise<void> {
    const beforeValidation = performance.now();
    const validationResult = schema.safeParse(value);
    if (!validationResult.success) {
      logger.error(
        `Failed to validate data for key ${key}`,
        validationResult.error
      );
      return;
    }
    const afterValidation = performance.now();
    logger.debug(
      `Data for key ${key} has been validated in ${
        afterValidation - beforeValidation
      }ms`
    );
    logger.debug(`Setting data for key ${key}`);
    const time = performance.now();
    await model.updateOne(
      { key },
      {
        $set: {
          ...value,
          key,
        },
      },
      { upsert: true, lean: true }
    );
    const endTime = performance.now();
    logger.debug(`Data for key ${key} has been set in ${endTime - time}ms`);
  }

  async function setMany(
    data: Record<string, Result>,
    options: {
      session?: ClientSession;
    }
  ): Promise<void> {
    logger.debug(`Setting data for keys ${Object.keys(data).join(", ")}`);
    const time = performance.now();
    await model.bulkWrite(
      Object.entries(data).map(([key, value]) => {
        const beforeValidation = performance.now();
        const validationResult = schema.safeParse(value);
        if (!validationResult.success) {
          logger.error(
            `Failed to validate data for key ${key}`,
            validationResult.error
          );
          throw new Error("Failed to validate data");
        }
        const afterValidation = performance.now();
        logger.debug(
          `Data for key ${key} has been validated in ${
            afterValidation - beforeValidation
          }ms`
        );
        return {
          updateOne: {
            filter: { key },
            update: {
              $set: {
                ...value,
                key,
              },
            },
            upsert: true,
          },
        };
      }),
      {
        session: options.session,
        checkKeys: false,
      }
    );
    const endTime = performance.now();
    logger.debug(
      `Data for keys ${Object.keys(data).join(", ")} has been set in ${
        endTime - time
      }ms`
    );
  }

  async function deleteOne(key: string): Promise<void> {
    logger.debug(`Deleting data for key ${key}`);
    const time = performance.now();
    await model.deleteOne({ key });
    const endTime = performance.now();
    logger.debug(`Data for key ${key} has been deleted in ${endTime - time}ms`);
  }

  async function query(
    query: {
      workflowName: string;
      repositoryName: string;
      repositoryOwner: string;
      branchName?: string;
      ranAt?: {
        min: Date;
        max: Date;
      };
      status?: string;
    },
    options?: { session?: ClientSession; limit?: number }
  ): Promise<Result[]> {
    const {
      workflowName,
      repositoryName,
      repositoryOwner,
      branchName,
      status,
    } = query;
    const { min = dayjs().subtract(1, "year").toDate(), max = new Date() } =
      query.ranAt ?? {};
    const { limit } = options ?? {};
    logger.debug(
      `Querying data for workflow ${workflowName} in repository ${repositoryName} by ${repositoryOwner}`
    );
    const time = performance.now();

    const result = await model
      .find({
        workflowName,
        repositoryName,
        repositoryOwner,
        ...(status ? { status } : {}),
        ...(min || max ? { runAt: { $gte: min, $lte: max } } : {}),
        ...(branchName ? { branchName } : {}),
      })
      .setOptions({ limit, lean: true });
    const endTime = performance.now();
    logger.debug(
      `Data for workflow ${workflowName} in repository ${repositoryName} by ${repositoryOwner} has been queried in ${
        endTime - time
      }ms`
    );

    return result;
  }

  return {
    query,
    setMany,
    get,
    set,
    delete: deleteOne,
    startTransaction: () => {
      if (!connection.db?.writeConcern) {
        return Promise.resolve(undefined);
      }
      return model.startSession();
    },
  };
}
