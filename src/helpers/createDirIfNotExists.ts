import "colors";
import { existsSync, mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { isExistingPath } from "./isExistingPath.js";
import logger from "../lib/Logger/logger.js";

export const createDirIfNotExists = async (filePath: string) => {
  const dir = dirname(filePath);
  if (!(await isExistingPath(dir))) {
    logger.debug("Creating directory", dir);
    await mkdir(dir, { recursive: true });
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
