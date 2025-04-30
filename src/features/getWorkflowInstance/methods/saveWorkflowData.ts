import {
  generateWorkflowKey,
  generateWorkflowRunKey,
} from "../../../cli/entities/RetrievedWorkflowData/methods/generateKey.js";
import type { RetrievedWorkflow } from "../../../cli/entities/RetrievedWorkflowData/types.js";
import type {
  WorkflowRunsStorage,
  WorkflowStorage,
} from "../../../entities/FormattedWorkflow/storage.js";
import type { FormattedWorkflowRun } from "../../../entities/FormattedWorkflow/types.js";
import logger from "../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../types/MethodResult.js";

export type SaveWorkflowDataResponse = Promise<
  MethodResult<RetrievedWorkflow, "failed_to_save_workflow_data">
>;

export type SaveWorkflowDataParams = {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
  workflowData: RetrievedWorkflow;
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
      repositoryName,
      repositoryOwner,
      branchName,
      newOrUpdatedRuns,
      workflowData,
    } = params;

    const { workflowWeekRunsMap, ...restWorkFlowData } = workflowData;

    const transaction = await workflowStorage.startTransaction();
    transaction?.startTransaction({});
    try {
      await workflowStorage.set(
        generateWorkflowKey({
          workflowName,
          workflowParams: {
            owner: repositoryOwner,
            repo: repositoryName,
            branchName,
          },
        }),
        {
          ...restWorkFlowData,
          workflowParams: {
            owner: restWorkFlowData.workflowParams.owner,
            repo: restWorkFlowData.workflowParams.repo,
            branchName: restWorkFlowData.workflowParams.branchName,
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
          acc[
            generateWorkflowRunKey({
              repositoryName: restWorkFlowData.workflowParams.repo,
              repositoryOwner: restWorkFlowData.workflowParams.owner,
              workflowName: restWorkFlowData.workflowName,
              runId: runs.runId,
              branchName: restWorkFlowData.workflowParams.branchName,
            })
          ] = {
            ...runs,
            workflowId: restWorkFlowData.workflowId,
            week_year: runs.week_year,
            repositoryName: restWorkFlowData.workflowParams.repo,
            repositoryOwner: restWorkFlowData.workflowParams.owner,
            branchName: restWorkFlowData.workflowParams.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
          return acc;
        }
        runs.forEach((run) => {
          acc[
            generateWorkflowRunKey({
              repositoryName: restWorkFlowData.workflowParams.repo,
              repositoryOwner: restWorkFlowData.workflowParams.owner,
              workflowName: restWorkFlowData.workflowName,
              runId: run.runId,
              branchName: restWorkFlowData.workflowParams.branchName,
            })
          ] = {
            ...run,
            workflowId: restWorkFlowData.workflowId,
            week_year: run.week_year,
            repositoryName: restWorkFlowData.workflowParams.repo,
            repositoryOwner: restWorkFlowData.workflowParams.owner,
            branchName: restWorkFlowData.workflowParams.branchName,
            workflowName: restWorkFlowData.workflowName,
          };
        });
        return acc;
      }, {});

      const runsCount = Object.keys(runs).length;
      if (runsCount === 0) {
        logger.warn(
          `No runs found for workflow ${workflowData.workflowName.yellow}`
        );
        return {
          hasFailed: false,
          data: workflowData,
        };
      }

      await Promise.all([
        workflowStorage.updateWithMongoSyntax(
          {
            key: generateWorkflowKey({
              workflowName,
              workflowParams: {
                owner: repositoryOwner,
                repo: repositoryName,
                branchName,
              },
            }),
          },
          {
            $inc: { totalWorkflowRuns: runsCount },
          },
          {
            session: transaction,
          }
        ),
        workflowRunsStorage.setMany(runs, {
          session: transaction,
        }),
      ]);
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
