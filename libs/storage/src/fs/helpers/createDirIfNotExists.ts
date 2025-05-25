import "colors";
import { existsSync, mkdirSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { buildIsExistingPath } from "./isExistingPath.js";
import type { Logger } from "winston";

const creatingMap = new Map<string, Promise<string | undefined>>();

export const buildCreateDirIfNotExists = (dependencies: {
	logger: Logger;
	isExistingPath?: ReturnType<typeof buildIsExistingPath>;
}) => {
	const { logger, isExistingPath = buildIsExistingPath(dependencies.logger) } =
		dependencies;

	return async function createDirIfNotExists(
		filePath: string,
	): Promise<string> {
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
};

export const buildCreateDirIfNotExistsSync =
	(logger: Logger) => (filePath: string) => {
		if (!existsSync(filePath)) {
			logger.debug("Creating directory", filePath);
			mkdirSync(filePath, { recursive: true });
		}

		return filePath;
	};
