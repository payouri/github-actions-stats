import { z } from "zod";
import { config } from "../../config/config.js";
import { createMongoStorage } from "../../storage/mongo.js";

const REPORTS_COLLECTION_NAME = "queue-job-execution-reports" as const;

export const queueJobExecutionReportsMongoStorage = createMongoStorage({
	collectionName: REPORTS_COLLECTION_NAME,
	indexes: config.MONGO.indexes.queueJobExecutionReport,
	schema: {
		version: "1.0.0",
		schema: z.object({
			name: z.string(),
			jobData: z.any(),
			startTime: z.date(),
			endTime: z.date(),
			createdTime: z.date(),
			status: z.enum(["success", "failed"]),
			result: z.any(),
		}),
	},
});

export async function initQueueJobExecutionReportsStorage() {
	await queueJobExecutionReportsMongoStorage.init();
}

export async function closeQueueJobExecutionReportsStorage() {
	await queueJobExecutionReportsMongoStorage.close();
}
