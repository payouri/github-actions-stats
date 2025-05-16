import mongoose, { type ClientSession } from "mongoose";
import type { AnyZodObject, z } from "zod";
import { config } from "../../config/config.js";
import { formatMs } from "../../helpers/format/formatMs.js";
import defaultLogger from "../../lib/Logger/logger.js";
import { buildQuery } from "./methods/query.js";
import type {
  CreateMongoStorageParams,
  DocumentWithKey,
  MongoStorage,
  MongoStorageCountMethod,
  MongoStorageDeleteMethod,
  MongoStorageGetMethod,
  MongoStorageIterateMethod,
  MongoStoragePartialUpdateMethod,
  MongoStorageSetMethod,
  MongoStorageUpdateWithMongoSyntaxMethod,
} from "./types.js";

const { connection, ConnectionStates, Schema } = mongoose;
mongoose.set("strictQuery", false);
mongoose.set("strict", false);

function getSchemaFields<T extends AnyZodObject>(
  schema: T
): Record<
  string,
  { type: typeof Schema.Types.Mixed | typeof Schema.Types.String }
> {
  return Object.entries(schema.shape).reduce<
    Record<
      string,
      {
        type: typeof Schema.Types.Mixed | typeof Schema.Types.String;
        required?: boolean;
        unique?: boolean;
      }
    >
  >(
    (acc, [fieldName]) => {
      acc[fieldName] = {
        type: Schema.Types.Mixed,
      };
      return acc;
    },
    {
      key: {
        type: Schema.Types.String,
        unique: true,
        required: true,
      },
      schemaVersion: {
        type: Schema.Types.String,
        required: true,
      },
    }
  );
}

export function createMongoStorage<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>,
  Storage extends MongoStorage<Schema, Result> = MongoStorage<Schema, Result>
>(params: CreateMongoStorageParams<Schema, Result, Storage>): Storage {
  const {
    schema: { schema, version: schemaVersion },
    collectionName,
    dbURI,
    logger = defaultLogger,
    dbName = config.MONGO.databaseName,
  } = params;

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
    logger.debug(
      `Data for key ${key} has been fetched in ${formatMs(endTime - time)}`
    );
    if (!result) return null;

    return result;
  }

  async function set(
    ...args: Parameters<Storage["set"]>
  ): ReturnType<MongoStorageSetMethod<Result>> {
    const [key, value] = args;

    try {
      const beforeValidation = performance.now();
      const validationResult = schema.safeParse(value);
      if (!validationResult.success) {
        logger.error(
          `Failed to validate data for key ${key}`,
          validationResult.error
        );
        return {
          hasFailed: true,
          error: {
            code: "validation_failed",
            message: "Failed to validate data",
            error: validationResult.error,
            data: undefined,
          },
        };
      }
      const afterValidation = performance.now();
      logger.debug(
        `Data for key ${key} has been validated in ${formatMs(
          afterValidation - beforeValidation
        )}`
      );
      logger.debug(`Setting data for key ${key}`);
      const time = performance.now();
      await model.updateOne(
        { key },
        {
          $set: {
            ...value,
            key,
            schemaVersion,
          },
        },
        { upsert: true, lean: true }
      );
      const endTime = performance.now();
      logger.debug(
        `Data for key ${key} has been set in ${formatMs(endTime - time)}`
      );
      return {
        hasFailed: false,
      };
    } catch (error) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_set_data",
          message: "Failed to set data",
          error: error instanceof Error ? error : new Error(String(error)),
          data: undefined,
        },
      };
    }
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
          `Data for key ${key} has been validated in ${formatMs(
            afterValidation - beforeValidation
          )}`
        );
        return {
          updateOne: {
            filter: { key },
            update: {
              $set: {
                ...value,
                key,
                schemaVersion,
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
      `Data for keys ${Object.keys(data).join(", ")} has been set in ${formatMs(
        endTime - time
      )}ms`
    );
  }

  async function deleteOne(
    key: Parameters<Storage["delete"]>[0]
  ): ReturnType<MongoStorageDeleteMethod<Result>> {
    logger.debug(`Deleting data for key ${key}`);
    const time = performance.now();
    await model.deleteOne({ key });
    const endTime = performance.now();
    logger.debug(
      `Data for key ${key} has been deleted in ${formatMs(endTime - time)}`
    );
  }

  async function count(
    query: Parameters<MongoStorageCountMethod<Result>>[0]
  ): ReturnType<MongoStorageCountMethod<Result>> {
    logger.debug(`Counting data for query ${JSON.stringify(query)}`);
    const time = performance.now();
    const result = await model.countDocuments(query);
    const endTime = performance.now();
    logger.debug(
      `Data for query ${JSON.stringify(query)} has been counted in ${formatMs(
        endTime - time
      )}`
    );

    return result;
  }

  function iterate(
    ...args: Parameters<MongoStorageIterateMethod<Result>>
  ): ReturnType<MongoStorageIterateMethod<Result>> {
    const [query, options = {}] = args;
    return model.find(query).cursor({
      ...options,
      lean: true,
    });
  }

  async function partialUpdate(
    ...args: Parameters<MongoStoragePartialUpdateMethod<Result>>
  ): ReturnType<MongoStoragePartialUpdateMethod<Result>> {
    const [key, update, options] = args;

    await model.updateOne(
      {
        key,
      },
      {
        $set: update,
      },
      options
    );
  }

  async function updateWithMongoSyntax(
    ...args: Parameters<MongoStorageUpdateWithMongoSyntaxMethod<Result>>
  ): ReturnType<MongoStorageUpdateWithMongoSyntaxMethod<Result>> {
    const [query, update, options] = args;

    await model.updateOne(query, update, options);
  }

  async function init() {
    if (connection.readyState !== ConnectionStates.connected) {
      if (connection.readyState === ConnectionStates.connecting) {
        logger.debug(`[${collectionName}] Waiting for MongoDB to connect`);
        await connection.asPromise();
      } else if (
        [
          ConnectionStates.disconnected,
          ConnectionStates.disconnecting,
        ].includes(connection.readyState)
      ) {
        while (connection.readyState !== ConnectionStates.disconnected) {
          logger.debug(`[${collectionName}] Waiting for MongoDB to disconnect`);
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        logger.debug(`[${collectionName}] Opening MongoDB connection`);
        await connection.openUri(dbURI, {
          dbName,
        });
      } else if (connection.readyState === ConnectionStates.uninitialized) {
        logger.debug(`[${collectionName}] Opening MongoDB connection`);
        await connection.openUri(dbURI, {
          dbName,
        });
      }
    }
    logger.debug(`[${collectionName}] MongoDB connection is open`);

    if (!connection.db) {
      throw new Error(`[${collectionName}] MongoDB connection is not open`);
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
  }

  async function close() {
    if (
      connection.readyState === ConnectionStates.disconnected ||
      connection.readyState === ConnectionStates.uninitialized
    ) {
      logger.debug(`[${collectionName}] MongoDB connection is not open`);
      return;
    }
    if (connection.readyState === ConnectionStates.connecting) {
      logger.debug(
        `Waiting for [${collectionName}] MongoDB connection to open before closing`
      );
      await connection.asPromise();
    } else if (connection.readyState === ConnectionStates.disconnecting) {
      logger.debug(
        `[${collectionName}] MongoDB is already closing, waiting for it to finish`
      );
    } else {
      logger.debug(`Closing [${collectionName}] MongoDB connection`);
    }
    await connection.close();
    logger.debug(`MongoDB connection has been closed`);
  }

  return {
    get model() {
      return model;
    },
    get schema() {
      return schema;
    },
    get hasInit() {
      return connection.readyState !== ConnectionStates.disconnected;
    },
    query: buildQuery({
      model,
      logger,
    }),
    partialUpdate,
    updateWithMongoSyntax,
    setMany,
    get,
    set,
    delete: deleteOne,
    close,
    count,
    iterate,
    startTransaction: () => {
      if (!connection.db?.writeConcern) {
        return Promise.resolve(undefined);
      }
      return model.startSession();
    },
    init,
  } as Storage;
}
