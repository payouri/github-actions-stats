import { access } from "node:fs/promises";
import logger from "../lib/Logger/logger.js";

const isExistingPathMap = new Map<string, Promise<boolean>>();

const accessPromise = async (path: string) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    logger.debug(`Path ${path} does not exist`);
    return false;
  }
};

export const isExistingPath = async (path: string): Promise<boolean> => {
  if (isExistingPathMap.has(path)) {
    const result = await isExistingPathMap.get(path);
    if (typeof result === "boolean") return result;
  }

  const promise = accessPromise(path);
  isExistingPathMap.set(path, promise);
  await promise;
  isExistingPathMap.delete(path);

  return promise;
};
