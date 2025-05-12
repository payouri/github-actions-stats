import { generateWorkflowRunKey } from "../helpers/generateWorkflowKey.js";
import { buildLoadWorkflowData } from "./FormattedWorkflow/storage/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "./FormattedWorkflow/storage/methods/saveWorkflowData.js";
import {
  workflowRunsStorage,
  workflowStorage,
} from "./FormattedWorkflow/storage/mongo.js";
import { buildUpsertWorkflowRunStat } from "./WorkflowStat/storage/createWorkflowStat.js";
import { workflowRunStatsMongoStorage } from "./WorkflowStat/storage/mongo.js";

const loadWorkflowData = buildLoadWorkflowData({
  workflowRunsStorage,
  workflowStorage,
});
const saveWorkflowData = buildSaveWorkflowData({
  workflowRunsStorage,
  workflowStorage,
});
const upsertWorkflowRunStat = buildUpsertWorkflowRunStat({
  workflowRunStatsStorage: workflowRunStatsMongoStorage,
});

export const DB = {
  queries: {
    getRunData: (params: { runId: number; workflowKey: string }) => {
      return workflowRunsStorage.get(
        generateWorkflowRunKey({
          runId: params.runId,
          workflowKey: params.workflowKey,
        })
      );
    },
    fetchWorkflowDataWithOldestRun: (params: { workflowKey: string }) =>
      loadWorkflowData(
        {
          workflowKey: params.workflowKey,
        },
        {
          onlyOldestRun: true,
        }
      ),
    fetchWorkflowDataWithNewestRun: (params: { workflowKey: string }) =>
      loadWorkflowData(
        {
          workflowKey: params.workflowKey,
        },
        {
          maxRunsToLoad: 1,
        }
      ),
  },
  mutations: {
    saveWorkflowData,
    upsertWorkflowRunStat,
  },
} as const;
