import type {
  ClientSession,
  Document,
  FilterQuery,
  IndexDefinition,
  IndexOptions,
  Model,
  ProjectionType,
  SortOrder,
  UpdateQuery,
} from "mongoose";
import type { Logger } from "winston";
import type { AnyZodObject, z } from "zod";
import type { OverrideMethods } from "../../types/OverrideMethods.js";
import type { Storage } from "../types.js";

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

export type MongoStorageCountMethod<Result> = (params: {
  repositoryName?: string;
  repositoryOwner?: string;
  status?: string;
  runAt?: {
    min: Date;
    max: Date;
  };
}) => Promise<number>;

export type MongoStoragePartialUpdateMethod<Result> = (
  key: string,
  update: Partial<Result>,
  options?: {
    session: ClientSession;
  }
) => Promise<void>;

export type MongoStorageUpdateWithMongoSyntaxMethod<Result> = (
  query: FilterQuery<DocumentWithKey<Result>>,
  update: UpdateQuery<Result>,
  options?: {
    session?: ClientSession;
  }
) => Promise<void>;

export type MongoStorageIterateMethod<Result> = (
  params: {
    [Key in Extract<
      keyof DocumentWithKey<Result>,
      keyof Result | "key"
    >]?: DocumentWithKey<Result>[Key];
  },
  options?: { projection?: ProjectionType<Result> }
) => AsyncIterable<DocumentWithKey<Result>, void, undefined>;

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
  options?: {
    session?: ClientSession;
    limit?: number;
    sort?: Record<string, SortOrder>;
  }
) => Promise<Result[]>;

export type CreateMongoStorageParams<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>,
  Storage extends MongoStorage<Schema, Result> = MongoStorage<Schema, Result>
> = {
  collectionName: string;
  dbURI: string;
  dbName?: string;
  indexes: [IndexDefinition, IndexOptions][];
  schema: {
    version: string;
    schema: Schema;
  };
  logger?: Logger;
};

export type MongoStorage<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>
> = OverrideMethods<
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
  count: MongoStorageCountMethod<Result>;
  iterate: MongoStorageIterateMethod<Result>;
  init: () => Promise<void>;
  close: () => Promise<void>;
  model: Model<DocumentWithKey<Result>>;
  partialUpdate: MongoStoragePartialUpdateMethod<Result>;
  updateWithMongoSyntax: MongoStorageUpdateWithMongoSyntaxMethod<Result>;
  schema: Schema;
};
