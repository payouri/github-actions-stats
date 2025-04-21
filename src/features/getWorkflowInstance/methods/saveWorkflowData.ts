import type {
  WorkflowRunsStorage,
  WorkflowStorage,
} from "../../../entities/FormattedWorkflow/storage.js";
import type { FormattedWorkflowRun } from "../../../entities/index.js";
import type { WorkFlowInstance } from "../../../cli/entities/RetrievedWorkflowData/types.js";
import logger from "../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../types/MethodResult.js";

export type SaveWorkflowDataResponse = Promise<
  MethodResult<WorkFlowInstance, "failed_to_save_workflow_data">
>;

export type SaveWorkflowDataParams = {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
  workflowData: WorkFlowInstance;
  newOrUpdatedRuns?: FormattedWorkflowRun[];
};

export type SaveWorkflowDataMethod = (
  params: SaveWorkflowDataParams
) => Promise<SaveWorkflowDataResponse>;

export type SaveWorkflowDataDependencies = {
  workflowStorage: WorkflowStorage;
  workflowRunsStorage: WorkflowRunsStorage;
};

export function buildSaveWorkflowData(
  dependencies: SaveWorkflowDataDependencies
) {
  const { workflowStorage, workflowRunsStorage } = dependencies;

  return async function saveWorkflowData(
    params: SaveWorkflowDataParams
  ): Promise<SaveWorkflowDataResponse> {
    const {
      workflowName,
      // repositoryName,
      // repositoryOwner,
      // branchName,
      newOrUpdatedRuns,
      workflowData,
    } = params;

    const {
      workflowWeekRunsMap,
      serializableData: _,
      formattedWorkflowRuns: __,
      ...restWorkFlowData
    } = workflowData;

    const transaction = await workflowStorage.startTransaction();
    transaction?.startTransaction({});
    try {
      await workflowStorage.set(
        workflowName,
        {
          ...restWorkFlowData,
          workflowParams: {
            owner: restWorkFlowData.repositoryOwner,
            repo: restWorkFlowData.repositoryName,
            branchName: restWorkFlowData.branchName,
          },
        },
        {
          session: transaction,
        }
      );
      const runsArrays = newOrUpdatedRuns || Object.values(workflowWeekRunsMap);
      if (runsArrays.length === 0) {
        logger.warn(
          `No runs found for workflow ${workflowData.workflowName.yellow}`
        );
        return {
          hasFailed: false,
          data: workflowData,
        };
      }

      const runs = runsArrays.reduce<
        Record<
          string,
          FormattedWorkflowRun & {
            workflowId: number;
            workflowName: string;
            repositoryName: string;
            repositoryOwner: string;
            branchName?: string;
          }
        >
      >((acc, runs) => {
        if (!Array.isArray(runs)) {
          acc[`${runs.workflowId}_${runs.runId}`] = {
            ...runs,
            status: runs.status,
            conclusion: runs.conclusion,
            usageData: runs.usageData,
            name: runs.name,
            runAt: runs.runAt,
            runId: runs.runId,
            workflowId: restWorkFlowData.workflowId,
            week_year: runs.week_year,
            repositoryName: restWorkFlowData.repositoryName,
            repositoryOwner: restWorkFlowData.repositoryOwner,
            branchName: restWorkFlowData.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
          return acc;
        }
        runs.forEach((run) => {
          acc[`${run.workflowId}_${run.runId}`] = {
            ...run,
            status: run.status,
            conclusion: run.conclusion,
            usageData: run.usageData,
            name: run.name,
            runAt: run.runAt,
            runId: run.runId,
            workflowId: restWorkFlowData.workflowId,
            week_year: run.week_year,
            repositoryName: restWorkFlowData.repositoryName,
            repositoryOwner: restWorkFlowData.repositoryOwner,
            branchName: restWorkFlowData.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
        });
        return acc;
      }, {});

      if (Object.keys(runs).length === 0) {
        logger.warn(
          `No runs found for workflow ${workflowData.workflowName.yellow}`
        );
        return {
          hasFailed: false,
          data: workflowData,
        };
      }

      await workflowRunsStorage.setMany(runs, {
        session: transaction,
      });
    } catch (error) {
      logger.error("Failed to save workflow data", error);
      await transaction?.abortTransaction();
    } finally {
      await transaction?.commitTransaction();
    }

    return {
      hasFailed: false,
      data: workflowData,
    };
  };
}
