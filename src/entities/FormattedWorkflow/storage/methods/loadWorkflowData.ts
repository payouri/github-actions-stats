import dayjs from "dayjs";
import { createWorkflowInstance } from "../../../../cli/entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "../../../../cli/entities/RetrievedWorkflowData/types.js";
import type {
  WorkflowRunsMongoStorage,
  WorkflowMongoStorage,
} from "../mongo.js";
import logger from "../../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../../types/MethodResult.js";
import {
  generateWorkflowKey,
  getWorkflowParamsFromKey,
} from "../../../../helpers/generateWorkflowKey.js";

export type LoadWorkflowDataResponse = Promise<
  MethodResult<WorkFlowInstance, "failed_to_load_workflow_data">
>;

export type LoadWorkflowDataParams =
  | {
      workflowName: string;
      repositoryName: string;
      repositoryOwner: string;
      branchName?: string;
    }
  | {
      workflowKey: string;
    };

export type LoadWorkflowDataOptions = {
  maxRunsToLoad?: number;
  onlyOldestRun?: boolean;
};

export type LoadWorkflowDataMethod = (
  params: LoadWorkflowDataParams
) => Promise<LoadWorkflowDataResponse>;

export type LoadWorkflowDataDependencies = {
  workflowStorage: WorkflowMongoStorage;
  workflowRunsStorage: WorkflowRunsMongoStorage;
};

export function buildLoadWorkflowData(
  dependencies: LoadWorkflowDataDependencies
) {
  const { workflowStorage, workflowRunsStorage } = dependencies;

  return async function loadWorkflowData(
    params: LoadWorkflowDataParams,
    options?: LoadWorkflowDataOptions
  ): Promise<LoadWorkflowDataResponse> {
    const { workflowName, repositoryName, repositoryOwner, branchName } =
      "workflowKey" in params
        ? getWorkflowParamsFromKey(params.workflowKey)
        : params;

    const { maxRunsToLoad = 100, onlyOldestRun = false } = options ?? {};

    const [workflowData, runsData] = await Promise.all([
      workflowStorage.get(
        "workflowKey" in params
          ? params.workflowKey
          : generateWorkflowKey({
              workflowName,
              workflowParams: {
                owner: repositoryOwner,
                repo: repositoryName,
                branchName,
              },
            })
      ),
      workflowRunsStorage.query(
        {
          workflowName,
          repositoryName,
          repositoryOwner,
          ...(branchName ? { branchName } : {}),
          ...(onlyOldestRun
            ? {}
            : {
                runAt: {
                  min: dayjs().subtract(90, "day").toDate(),
                  max: new Date(),
                },
              }),
        },
        {
          limit: onlyOldestRun ? 1 : maxRunsToLoad,
          sort: onlyOldestRun ? { runAt: 1 } : undefined,
        }
      ),
    ]);

    if (!workflowData) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_load_workflow_data",
          message: "Failed to load workflow data",
          error: new Error("Failed to load workflow data"),
          data: undefined,
        },
      };
    }

    const data = createWorkflowInstance({
      ...workflowData,
      workflowWeekRunsMap: runsData.reduce<
        WorkFlowInstance["workflowWeekRunsMap"]
      >((acc, run) => {
        if (!acc[run.week_year]) acc[run.week_year] = [];
        acc[run.week_year].push(run);

        return acc;
      }, {}),
    });

    logger.debug({
      workflowId: data.workflowId,
      workflowName: data.workflowName,
    });

    return {
      hasFailed: false,
      data,
    };
  };
}
