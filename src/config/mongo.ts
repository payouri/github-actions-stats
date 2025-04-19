import type { IndexDefinition, IndexOptions } from "mongoose";

export const MONGO_CONFIG = {
  dbURI: "mongodb://localhost:27017/My_Db",
  testDbURI: "mongodb://localhost:27017/Test_My_Db",
  collectionName: "workflow-stats",
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
