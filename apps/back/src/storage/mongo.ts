import {
	type CreateMongoStorageParams,
	type MongoStorage,
	createMongoStorage as defaultCreateMongoStorage,
} from "@github-actions-stats/storage";
import logger from "../lib/Logger/logger.js";
import { config } from "../config/config.js";
import type { AnyZodObject } from "zod";

export function createMongoStorage<T extends AnyZodObject>(
	params: Pick<
		CreateMongoStorageParams<T>,
		"collectionName" | "schema" | "indexes"
	>,
): MongoStorage<T> {
	return defaultCreateMongoStorage({
		...params,
		logger,
		dbName: config.MONGO.databaseName,
		dbURI: config.MONGO.dbURI,
	});
}
