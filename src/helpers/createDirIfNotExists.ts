import "colors";
import { existsSync, mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { isExistingPath } from "./isExistingPath.js";
import logger from "../lib/Logger/logger.js";

const creatingMap = new Map<string, Promise<string | undefined>>();

export const createDirIfNotExists = async (
  filePath: string
): Promise<string> => {
  const dir = dirname(filePath);
  if (creatingMap.has(dir)) {
    await creatingMap.get(dir);
    return filePath;
  }

  if (!(await isExistingPath(dir))) {
    logger.debug("Creating directory", dir);
    creatingMap.set(dir, mkdir(dir, { recursive: true }));
    await creatingMap.get(dir);
    creatingMap.delete(dir);
  }

  return filePath;
};
export const createDirIfNotExistsSync = (filePath: string) => {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    logger.debug("Creating directory", dir);
    mkdirSync(dir, { recursive: true });
  }

  return filePath;
};
