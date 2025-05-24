import type { IndexDefinition, IndexOptions } from "mongoose";

export const MONGO_CONFIG = {
  dbURI: process.env.MONGODB_URI || "mongodb://localhost:27017/",
  testDbURI: process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/",
  databaseName: process.env.MONGODB_DATABASE_NAME || "Test_My_Db",
  indexes: {
    queueJobExecutionReport: [
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
          expires: "7d",
        },
      ],
    ],
    pendingJob: [
      [
        {
          group: 1,
          createdAt: 1,
        },
        {},
      ],
    ],
    workflows: [
      [
        {
          workflowId: 1,
        } satisfies IndexDefinition,
        {} satisfies IndexOptions,
      ],
    ],
    workflowRuns: [
      [
        {
          workflowId: 1,
          status: 1,
          conclusion: 1,
          runAt: -1,
        },
        {},
      ],
      [
        {
          workflowId: 1,
        },
        {},
      ],
    ],
    workflowStats: [],
  } satisfies Record<string, [IndexDefinition, IndexOptions][]>,
} as const;
