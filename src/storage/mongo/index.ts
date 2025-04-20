import mongoose, {
  type ClientSession,
  type IndexDefinition,
  type IndexOptions,
} from "mongoose";
import type { Logger } from "winston";
import type { AnyZodObject, z } from "zod";
import defaultLogger from "../../lib/Logger/logger.js";
import { buildQuery } from "./methods/query.js";
import type {
  DocumentWithKey,
  MongoStorage,
  MongoStorageDeleteMethod,
  MongoStorageGetMethod,
  MongoStorageSetMethod,
} from "./types.js";

const { connection, ConnectionStates, Schema } = mongoose;
mongoose.set("strictQuery", false);
mongoose.set("strict", false);

function getSchemaFields<T extends AnyZodObject>(
  schema: T
): Record<string, { type: typeof Schema.Types.Mixed }> {
  return Object.entries(schema.shape).reduce<
    Record<string, { type: typeof Schema.Types.Mixed }>
  >((acc, [fieldName]) => {
    acc[fieldName] = {
      type: Schema.Types.Mixed,
    };
    return acc;
  }, {});
}

export function createMongoStorage<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>,
  Storage extends MongoStorage<Result> = MongoStorage<Result>
>(params: {
  collectionName: string;
  dbURI: string;
  indexes: [IndexDefinition, IndexOptions][];
  schema: Schema;
  logger?: Logger;
}): Storage {
  const { schema, collectionName, dbURI, logger = defaultLogger } = params;

  const mongooseSchema = new Schema<DocumentWithKey<Result>>(
    getSchemaFields(schema),
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

  async function get(
    key: Parameters<MongoStorageGetMethod<Result>>[0]
  ): ReturnType<MongoStorageGetMethod<Result>> {
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

  async function set(
    ...args: Parameters<Storage["set"]>
  ): ReturnType<MongoStorageSetMethod<Result>> {
    const [key, value] = args;

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

  async function deleteOne(
    key: Parameters<Storage["delete"]>[0]
  ): ReturnType<MongoStorageDeleteMethod<Result>> {
    logger.debug(`Deleting data for key ${key}`);
    const time = performance.now();
    await model.deleteOne({ key });
    const endTime = performance.now();
    logger.debug(`Data for key ${key} has been deleted in ${endTime - time}ms`);
  }

  return {
    get hasInit() {
      return connection.readyState !== ConnectionStates.disconnected;
    },
    query: buildQuery({
      model,
      logger,
    }),
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
    init: async () => {
      if (connection.readyState !== ConnectionStates.connected) {
        if (connection.readyState === ConnectionStates.connecting) {
          logger.debug("Waiting for MongoDB to connect");
          await connection.asPromise();
        } else if (
          [
            ConnectionStates.disconnected,
            ConnectionStates.disconnecting,
          ].includes(connection.readyState)
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
    },
  } as Storage;
}
