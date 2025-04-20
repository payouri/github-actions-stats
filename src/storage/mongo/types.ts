import type { ClientSession, Document } from "mongoose";
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
