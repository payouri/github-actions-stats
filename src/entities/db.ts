import { generateWorkflowRunKey } from "../helpers/generateWorkflowKey.js";
import { buildLoadWorkflowData } from "./FormattedWorkflow/storage/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "./FormattedWorkflow/storage/methods/saveWorkflowData.js";
import {
  workflowRunsMongoStorage,
  workflowMongoStorage,
} from "./FormattedWorkflow/storage/mongo.js";
import { buildAggregateStatsOnPeriodAndSave } from "./WorkflowStat/methods/aggregateStatsOnPeriod.js";
import { buildUpsertWorkflowRunStat } from "./WorkflowStat/storage/createWorkflowStat.js";
import {
  aggregatedWorkflowStatsMongoStorage,
  workflowRunStatsMongoStorage,
} from "./WorkflowStat/storage/mongo.js";

const loadWorkflowData = buildLoadWorkflowData({
  workflowRunsStorage: workflowRunsMongoStorage,
  workflowStorage: workflowMongoStorage,
});
const saveWorkflowData = buildSaveWorkflowData({
  workflowRunsStorage: workflowRunsMongoStorage,
  workflowStorage: workflowMongoStorage,
});
const upsertWorkflowRunStat = buildUpsertWorkflowRunStat({
  workflowRunStatsStorage: workflowRunStatsMongoStorage,
});
const aggregateAndSaveStats = buildAggregateStatsOnPeriodAndSave({
  aggregatedWorkflowStatsMongoStorage,
  workflowRunStatsMongoStorage,
});

export const DB = {
  queries: {
    async countDocumentsOnVersion(params: { version: string }) {
      const [workflowCount, workflowRunCount] = await Promise.all([
        workflowMongoStorage.count({
          version: params.version,
        }),
        workflowRunsMongoStorage.count({
          version: params.version,
        }),
      ]);

      return {
        workflowCount,
        workflowRunCount,
      };
    },
    getRunData(params: { runId: number; workflowKey: string }) {
      return workflowRunsMongoStorage.get(
        generateWorkflowRunKey({
          runId: params.runId,
          workflowKey: params.workflowKey,
        })
      );
    },
    fetchWorkflowDataWithOldestRun(params: { workflowKey: string }) {
      return loadWorkflowData(
        {
          workflowKey: params.workflowKey,
        },
        {
          onlyOldestRun: true,
        }
      );
    },
    fetchWorkflowDataWithNewestRun(params: { workflowKey: string }) {
      return loadWorkflowData(
        {
          workflowKey: params.workflowKey,
        },
        {
          maxRunsToLoad: 1,
        }
      );
    },
  },
  mutations: {
    aggregateAndSaveStats,
    saveWorkflowData,
    upsertWorkflowRunStat,
  },
} as const;
