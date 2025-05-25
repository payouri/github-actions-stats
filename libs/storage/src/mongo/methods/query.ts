import { formatMs } from "@github-actions-stats/common-utils";
import type { Document, Model } from "mongoose";
import type { Logger } from "winston";
import type { MongoStorageQueryMethod } from "../types.js";

export function buildQuery<Result>(dependencies: {
	logger: Logger;
	model: Model<Result & { key: string } & Document>;
}) {
	const { logger, model } = dependencies;

	return async function query(
		...args: Parameters<MongoStorageQueryMethod<Result>>
	): ReturnType<MongoStorageQueryMethod<Result>> {
		const [params, options] = args;

		const { limit, sort, projection, session, start } = options ?? {};
		logger.debug(`Querying data in collection ${model.modelName}`);
		const time = performance.now();

		const result = await model
			.find(params)
			.setOptions({ skip: start, limit, sort, session, projection })
			.lean()
			.exec();
		const endTime = performance.now();
		logger.debug(
			`Data for collection ${
				model.modelName
			} has been queried in ${formatMs(endTime - time)}ms`,
		);

		return result as Awaited<ReturnType<MongoStorageQueryMethod<Result>>>;
	};
}
