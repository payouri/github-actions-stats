import "colors";
import { existsSync, mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import logger from "../lib/Logger/logger.js";
import { isExistingPath } from "./isExistingPath.js";

const creatingMap = new Map<string, Promise<string | undefined>>();

export const createDirIfNotExists = async (
  filePath: string
): Promise<string> => {
  if (creatingMap.has(filePath)) {
    await creatingMap.get(filePath);
    return filePath;
  }

  if (!(await isExistingPath(filePath))) {
    logger.debug("Creating directory", filePath);
    creatingMap.set(filePath, mkdir(filePath, { recursive: true }));
    await creatingMap.get(filePath);
    creatingMap.delete(filePath);
  }

  return filePath;
};
export const createDirIfNotExistsSync = (filePath: string) => {
  if (!existsSync(filePath)) {
    logger.debug("Creating directory", filePath);
    mkdirSync(filePath, { recursive: true });
  }

  return filePath;
};
