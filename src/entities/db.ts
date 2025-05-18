import { generateWorkflowRunKey } from "../helpers/generateWorkflowKey.js";
import { buildLoadWorkflowData } from "./FormattedWorkflow/storage/methods/loadWorkflowData.js";
import { buildSaveWorkflowData } from "./FormattedWorkflow/storage/methods/saveWorkflowData.js";
import {
  workflowRunsMongoStorage,
  workflowMongoStorage,
} from "./FormattedWorkflow/storage/mongo.js";
import type { FormattedWorkflowRun } from "./FormattedWorkflow/types.js";
import { buildAggregateStatsOnPeriodAndSave } from "./WorkflowStat/methods/aggregateStatsOnPeriod.js";
import { buildUpsertWorkflowRunStat } from "./WorkflowStat/methods/createWorkflowStat.js";
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
    getRunData(
      params:
        | { runId: number; workflowKey: string }
        | {
            runKey: string;
          }
    ) {
      return workflowRunsMongoStorage.get(
        "runKey" in params
          ? params.runKey
          : generateWorkflowRunKey({
              runId: params.runId,
              workflowKey: params.workflowKey,
            })
      );
    },
    getWorkflowData(params: { workflowKey: string }) {
      return workflowMongoStorage.get(params.workflowKey);
    },
    async isExistingWorkflow(params: {
      workflowKey: string;
    }): Promise<boolean> {
      return (
        (
          await workflowMongoStorage.query(
            {
              key: params.workflowKey,
            },
            {
              limit: 1,
              projection: { key: 1, _id: 0 },
            }
          )
        ).length > 0
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
    async addWorkflowRun(params: {
      workflowKey: string;
      workflowRun: FormattedWorkflowRun & {
        workflowId: number;
        workflowName: string;
        repositoryName: string;
        repositoryOwner: string;
        branchName?: string;
      };
    }) {
      const clientSession = await workflowRunsMongoStorage.startTransaction();
      try {
        const setResult = await workflowRunsMongoStorage.set(
          generateWorkflowRunKey({
            workflowKey: params.workflowKey,
            runId: params.workflowRun.runId,
          }),
          params.workflowRun,
          {
            session: clientSession,
          }
        );
        if (setResult.hasFailed) {
          await clientSession?.abortTransaction();
          return setResult;
        }
        if (setResult.data.wasExistingKey) {
          return {
            hasFailed: false,
          } as const;
        }
        await workflowMongoStorage.updateWithMongoSyntax(
          {
            key: params.workflowKey,
          },
          {
            $inc: {
              totalWorkflowRuns: 1,
            },
          }
        );
        await clientSession?.commitTransaction();
        return {
          hasFailed: false,
        } as const;
      } catch (error) {
        await clientSession?.abortTransaction();
        throw error;
      }
    },
    aggregateAndSaveStats,
    saveWorkflowData,
    upsertWorkflowRunStat,
  },
} as const;
