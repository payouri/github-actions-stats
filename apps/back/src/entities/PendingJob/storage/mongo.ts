import { createMongoStorage } from "../../../storage/mongo.js";
import {
	PENDING_JOB_COLLECTION_NAME,
	PENDING_JOB_SCHEMA_VERSION,
} from "../constants.js";
import { pendingJobSchema } from "../schemas/pendingJob.schema.js";

export const pendingJobsMongoStorage = createMongoStorage({
	collectionName: PENDING_JOB_COLLECTION_NAME,
	schema: {
		schema: pendingJobSchema,
		version: PENDING_JOB_SCHEMA_VERSION,
	},
});

export function initPendingJobsMongoStorage() {
	return pendingJobsMongoStorage.init();
}

export function closePendingJobsMongoStorage() {
	return pendingJobsMongoStorage.close();
}
