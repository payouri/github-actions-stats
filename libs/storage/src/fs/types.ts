import type { OverrideMethods } from "@github-actions-stats/types-utils";
import type { Logger } from "winston";
import type { AnyZodObject, z } from "zod";
import type { Storage } from "../types.js";

export type FileFormat = "json";

export type FSStorageGetMethod<Result extends z.infer<AnyZodObject>> = (
	key: Parameters<Storage<Result>["get"]>[0],
) => Promise<Result | null>;

export type FSStorageGetManyMethod<Result extends z.infer<AnyZodObject>> = (
	keys: Parameters<Storage<Result>["getMany"]>[0],
) => Promise<Record<string, Result | null>>;

export type FSStorageDeleteMethod<Result extends z.infer<AnyZodObject>> = (
	key: Parameters<Storage<Result>["delete"]>[0],
) => Promise<void>;

export type FSStorageSetManyMethod<Result extends z.infer<AnyZodObject>> = (
	data: Parameters<Storage<Result>["setMany"]>[0],
) => Promise<void>;

export type FSStorageSetMethod<Result extends z.infer<AnyZodObject>> = (
	key: Parameters<Storage<Result>["set"]>[0],
	value: Parameters<Storage<Result>["set"]>[1],
) => Promise<void>;

export type FSStorageQueryMethod<Result extends z.infer<AnyZodObject>> = (
	query: Record<string, unknown>,
) => Promise<Result[]>;

export type CreateFSStorageParams<
	Schema extends AnyZodObject,
	Result extends z.infer<Schema>,
> = {
	directory: string;
	generateFileName?: (params: { key: string; format: FileFormat }) => string;
	format?: FileFormat;
	logger: Logger;
	schema: Schema;
};

export type FSStorage<
	Schema extends AnyZodObject,
	Result extends z.infer<Schema> = z.infer<Schema>,
> = OverrideMethods<
	Storage<Result>,
	{
		get: FSStorageGetMethod<Result>;
		// query: FSStorageQueryMethod<Result>;
		delete: FSStorageDeleteMethod<Result>;
		setMany: FSStorageSetManyMethod<Result>;
		set: FSStorageSetMethod<Result>;
		query: FSStorageQueryMethod<Result>;
	}
> & {
	getFilePath: (key: string) => string;
	schema: Schema;
	init: () => Promise<void>;
};
