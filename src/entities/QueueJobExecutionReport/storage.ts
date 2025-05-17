import { z } from "zod";
import { createMongoStorage } from "../../storage/mongo/index.js";
import logger from "../../lib/Logger/logger.js";

const REPORTS_COLLECTION_NAME = "queue-job-execution-reports" as const;

export const queueJobExecutionReportsMongoStorage = createMongoStorage({
  collectionName: REPORTS_COLLECTION_NAME,
  dbURI: process.env.MONGODB_URI || "mongodb://localhost:27017/",
  dbName: process.env.MONGODB_DATABASE_NAME || "Test_My_Db",
  indexes: [
    [
      {
        status: 1,
        name: 1,
      },
      {},
    ],
    [
      {
        createdAt: 1,
      },
      {
        expires: "14d",
      },
    ],
  ],
  logger,
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
  logger.debug("Initializing Queue Job Execution Reports MongoDB storage");
  const start = performance.now();
  await queueJobExecutionReportsMongoStorage.init();
  logger.debug(
    `Queue Job Execution Reports MongoDB storage has been initialized in ${(
      performance.now() - start
    ).toFixed(2)}ms`
  );
}

export async function closeQueueJobExecutionReportsStorage() {
  logger.debug("Closing Queue Job Execution Reports MongoDB storage");
  const start = performance.now();
  await queueJobExecutionReportsMongoStorage.close();
  logger.debug(
    `Queue Job Execution Reports MongoDB storage has been closed in ${(
      performance.now() - start
    ).toFixed(2)}ms`
  );
}
