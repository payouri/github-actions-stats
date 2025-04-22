import { readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve } from "node:path";
import type { AnyZodObject, z } from "zod";
import { createDirIfNotExists } from "../../helpers/createDirIfNotExists.js";
import { isExistingPath } from "../../helpers/isExistingPath.js";
import defaultLogger from "../../lib/Logger/logger.js";
import type {
  CreateFSStorageParams,
  FileFormat,
  FSStorage,
  FSStorageDeleteMethod,
  FSStorageGetManyMethod,
  FSStorageGetMethod,
  FSStorageQueryMethod,
  FSStorageSetManyMethod,
  FSStorageSetMethod,
} from "./types.js";

function defaultGenerateFileName(params: { key: string; format: FileFormat }) {
  return `${params.key}.${params.format}`;
}

export function createFSStorage<
  Schema extends AnyZodObject,
  Result extends z.infer<Schema> = z.infer<Schema>,
  Storage extends FSStorage<Schema, Result> = FSStorage<Schema, Result>
>(params: CreateFSStorageParams<Schema, Result>): Storage {
  const {
    directory: directoryConf,
    generateFileName = defaultGenerateFileName,
    format = "json",
    logger = defaultLogger,
    schema,
  } = params;

  const absoluteDirectory = isAbsolute(directoryConf)
    ? directoryConf
    : resolve(process.cwd(), directoryConf);

  function getFilePath(key: string) {
    return resolve(absoluteDirectory, generateFileName({ key, format }));
  }

  async function init() {
    await createDirIfNotExists(absoluteDirectory);
  }

  async function get(
    ...params: Parameters<FSStorageGetMethod<Result>>
  ): ReturnType<FSStorageGetMethod<Result>> {
    const [key] = params;
    const filePath = resolve(
      absoluteDirectory,
      generateFileName({ key, format })
    );
    logger.debug(`Getting data for key ${key}, file path ${filePath}`);
    if (!(await isExistingPath(filePath))) {
      logger.warn(`File ${filePath} does not exist`);
      return null;
    }

    const start = performance.now();
    const data = JSON.parse(await readFile(filePath, "utf-8"));
    const end = performance.now();
    logger.debug(`Data for key ${key} has been fetched in ${end - start}ms`);

    return schema.parse(data) as Result;
  }

  async function set(
    ...params: Parameters<FSStorageSetMethod<Result>>
  ): ReturnType<FSStorageSetMethod<Result>> {
    const [key, value] = params;
    const filePath = resolve(
      absoluteDirectory,
      generateFileName({ key, format })
    );

    const targetDir = dirname(filePath);
    if (!(await isExistingPath(targetDir))) {
      await createDirIfNotExists(targetDir);
    }
    logger.debug(`Setting data for key ${key}, file path ${filePath}`);
    const start = performance.now();
    const data = JSON.stringify(schema.parse(value), null, 0);

    await writeFile(filePath, data);
    const end = performance.now();
    logger.debug(`Data for key ${key} has been set in ${end - start}ms`);
  }

  async function setMany(
    ...params: Parameters<FSStorageSetManyMethod<Result>>
  ): ReturnType<FSStorageSetManyMethod<Result>> {
    const [data] = params;

    for (const [key, value] of Object.entries(data)) {
      await set(key, value);
    }
  }

  async function deleteOne(
    ...params: Parameters<FSStorageDeleteMethod<Result>>
  ): ReturnType<FSStorageDeleteMethod<Result>> {
    const [key] = params;
    const filePath = resolve(
      absoluteDirectory,
      generateFileName({ key, format })
    );
    logger.debug(`Deleting data for key ${key}, file path ${filePath}`);
    if (!(await isExistingPath(filePath))) {
      logger.warn(`File ${filePath} does not exist`);
      return;
    }

    const start = performance.now();
    await unlink(filePath);
    const end = performance.now();
    logger.debug(`Data for key ${key} has been deleted in ${end - start}ms`);
  }

  async function getMany(
    ...params: Parameters<FSStorageGetManyMethod<Result>>
  ): ReturnType<FSStorageGetManyMethod<Result>> {
    const [keys] = params;
    logger.debug(`Getting data for keys ${keys.length} count`);
    const directory = dirname(
      resolve(absoluteDirectory, generateFileName({ key: keys[0], format }))
    );
    if (!(await isExistingPath(directory))) {
      logger.debug(`Directory ${directory} does not exist`);
      return {};
    }

    const start = performance.now();
    const data = await Promise.all(
      keys.map<Promise<[string, Result | null]>>(async (key) => [
        key,
        await get(key),
      ])
    );
    const end = performance.now();
    logger.debug(`Data for keys ${keys} has been fetched in ${end - start}ms`);

    return data.reduce<Record<string, Result | null>>((acc, [key, value]) => {
      if (value) acc[key] = value;

      return acc;
    }, {});
  }

  return {
    init,
    delete: deleteOne,
    setMany,
    get,
    set,
    query: (async () => []) as FSStorageQueryMethod<Result>,
    getMany,
    getFilePath,
  } as Storage;
}
