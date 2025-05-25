import { access } from "node:fs/promises";
import type { Logger } from "winston";

const isExistingPathMap = new Map<string, Promise<boolean>>();

const buildAccessPromise = (logger: Logger) => async (path: string) => {
	try {
		await access(path);
		return true;
	} catch (error) {
		logger.debug(`Path ${path} does not exist`);
		return false;
	}
};

export const buildIsExistingPath = (logger: Logger) => {
	const accessPromise = buildAccessPromise(logger);

	return async (path: string): Promise<boolean> => {
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
};
