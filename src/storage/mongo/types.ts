import type {
  ClientSession,
  Document,
  IndexDefinition,
  IndexOptions,
} from "mongoose";
import type { OverrideMethods } from "../../types/OverrideMethods.js";
import type { Storage } from "../types.js";
import type { Logger } from "winston";
import type { AnyZodObject, z } from "zod";

export type DocumentWithKey<T> = T & {
  key: string;
} & Document;

export type MongoStorageSetMethod<Result> = (
  key: Parameters<Storage<Result>["set"]>[0],
  value: Parameters<Storage<Result>["set"]>[1],
  options?: { session?: ClientSession }
) => Promise<void>;

export type MongoStorageDeleteMethod<Result> = (
  key: Parameters<Storage<Result>["delete"]>[0],
  options?: { session?: ClientSession }
) => Promise<void>;

export type MongoStorageGetMethod<Result> = (
  key: Parameters<Storage<Result>["get"]>[0],
  options?: { session?: ClientSession }
) => Promise<Result | null>;

export type MongoStorageSetManyMethod<Result> = (
  data: Parameters<Storage<Result>["setMany"]>[0],
  options?: { session?: ClientSession }
) => Promise<void>;

export type MongoStorageQueryMethod<Result> = (
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

export type CreateMongoStorageParams<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>,
  Storage extends MongoStorage<Result> = MongoStorage<Result>
> = {
  collectionName: string;
  dbURI: string;
  dbName?: string;
  indexes: [IndexDefinition, IndexOptions][];
  schema: Schema;
  logger?: Logger;
};

export type MongoStorage<Result> = OverrideMethods<
  Storage<Result>,
  {
    setMany: MongoStorageSetManyMethod<Result>;
    set: MongoStorageSetMethod<Result>;
    delete: MongoStorageDeleteMethod<Result>;
    get: MongoStorageGetMethod<Result>;
    query: MongoStorageQueryMethod<Result>;
  }
> & {
  startTransaction: () => Promise<ClientSession | undefined>;
  hasInit: boolean;
  init: () => Promise<void>;
};
