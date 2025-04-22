import type { IndexDefinition, IndexOptions } from "mongoose";

export const MONGO_CONFIG = {
  dbURI: process.env.MONGODB_URI || "mongodb://localhost:27017/",
  testDbURI: process.env.TEST_MONGODB_URI || "mongodb://localhost:27017/",
  databaseName: process.env.MONGODB_DATABASE_NAME || "Test_My_Db",
  indexes: {
    workflows: [
      [
        {
          workflowId: 1,
        } satisfies IndexDefinition,
        {} satisfies IndexOptions,
      ],
    ] satisfies [IndexDefinition, IndexOptions][],
    workflowRuns: [
      [
        {
          workflowId: 1,
          status: 1,
          conclusion: 1,
          runAt: -1,
        } satisfies IndexDefinition,
        {} satisfies IndexOptions,
      ],
      [
        {
          workflowId: 1,
        } satisfies IndexDefinition,
        {} satisfies IndexOptions,
      ],
    ] satisfies [IndexDefinition, IndexOptions][],
  },
} as const;
