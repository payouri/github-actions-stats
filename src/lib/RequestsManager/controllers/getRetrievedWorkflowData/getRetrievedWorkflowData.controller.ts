import type { components } from "@octokit/openapi-types";
import "colors";
import type { GetAllJobsByIdsController } from "lib/RequestsManager/controllers/getAllJobsByIds.controller.js";
import type { GetWorkflowRunsUsageController } from "lib/RequestsManager/controllers/getWorkflowRunsUsage.controller.js";
import { getJobsArray } from "entities/FormattedWorkflow/helpers/getJobsArray.js";
import { updateJobsDataFromMap } from "entities/FormattedWorkflow/helpers/updateJobsDataFromMap.js";
import type { FormattedWorkflowRun } from "entities/index.js";
import { retrievedWorkflowService } from "cli/entities/RetrievedWorkflowData/index.js";
import { createWorkflowInstance } from "cli/entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "cli/entities/RetrievedWorkflowData/types.js";
import type { GetAllWorkflowsController } from "../getAllWorkflowRuns.controller.js";
import type { MethodResult } from "../../../../types/MethodResult.js";
import logger from "../../../Logger/logger.js";
import { getWorkflowStoragePath } from "../../../../cli/entities/RetrievedWorkflowData/storage.js";

export type BuildGetRetrievedWorkflowDataControllerDependencies = {
  getAllWorkflowsController: GetAllWorkflowsController<FormattedWorkflowRun>;
  getWorkflowRunsUsageController: GetWorkflowRunsUsageController;
  getAllJobsByIds: GetAllJobsByIdsController;
};

export type GetRetrievedWorkflowDataControllerParams = {
  owner: string;
  repo: string;
  workflowId: number;
  workflowName: string;
  saveRunsEvery?: number;
  workflowStatus?: components["parameters"]["workflow-run-status"];
  branchName?: string;
  filePath?: string;
};

export type GetRetrievedWorkflowDataControllerResponse = MethodResult<
  WorkFlowInstance,
  | "file_does_not_exist"
  | "failed_to_load_workflow_data"
  | "no_workflow_runs_found"
  | "failed_to_save_workflow_data"
>;

export type GetRetrievedWorkflowDataController = (
  params: GetRetrievedWorkflowDataControllerParams
) => Promise<GetRetrievedWorkflowDataControllerResponse>;

export type BuildGetRetrievedWorkflowDataController = (
  dependencies: BuildGetRetrievedWorkflowDataControllerDependencies
) => GetRetrievedWorkflowDataController;

export const buildGetRetrievedWorkflowDataController: BuildGetRetrievedWorkflowDataController =
  (dependencies) => {
    const {
      getAllWorkflowsController,
      getWorkflowRunsUsageController,
      getAllJobsByIds,
    } = dependencies;

    return async (
      params
    ): Promise<GetRetrievedWorkflowDataControllerResponse> => {
      const {
        workflowName,
        workflowId,
        owner,
        repo,
        branchName,
        workflowStatus,
        saveRunsEvery,
      } = params;

      const filePath = getWorkflowStoragePath({
        repositoryName: repo,
        repositoryOwner: owner,
        workflowName,
        branchName,
      });
      logger.debug("Loading workflow data located at", filePath.bold);

      const loadRetrievedWorkflowDataResponse =
        await retrievedWorkflowService.loadRetrievedWorkflowData({
          workflowName,
          workflowParams: {
            owner,
            repo,
            branchName: branchName,
            workflowStatus: workflowStatus,
          },
        });

      if (
        loadRetrievedWorkflowDataResponse.hasFailed &&
        ["FILE_DOES_NOT_EXIST", "FAILED_TO_LOAD_WORKFLOW_DATA"].includes(
          loadRetrievedWorkflowDataResponse.error.message
        ) === false
      ) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_load_workflow_data",
            message: loadRetrievedWorkflowDataResponse.error.message,
            error: loadRetrievedWorkflowDataResponse.error,
            data: undefined,
          },
        };
      }

      const workflowInstance = createWorkflowInstance(
        loadRetrievedWorkflowDataResponse.hasFailed
          ? {
              lastRunAt: new Date(),
              oldestRunAt: new Date(),
              lastUpdatedAt: new Date(),
              totalWorkflowRuns: 0,
              workflowId,
              workflowName,
              workflowParams: {
                owner,
                repo,
                branchName,
              },
              workflowWeekRunsMap: {},
            }
          : loadRetrievedWorkflowDataResponse.data,
        {
          autoCommit: !saveRunsEvery
            ? false
            : {
                every: saveRunsEvery,
                path: filePath,
              },
        }
      );

      logger.debug("Retrieving new workflow runs...".bgBlack.yellow);
      const newWorkflowRuns = await getAllWorkflowsController({
        owner,
        repo,
        workflowId,
        branchName,
        workflowStatus: "completed",
        createdAfter: !loadRetrievedWorkflowDataResponse.hasFailed
          ? workflowInstance.lastRunAt.toISOString()
          : undefined,
        onFinalWorkflow: (workflowRun) => {
          if (!workflowInstance.isExistingRunData(workflowRun.runId)) {
            // logger.debug("Adding run data for workflow run", workflowRun.runId);
            workflowInstance.addRunData({
              runId: workflowRun.runId,
              runData: workflowRun,
            });
            return;
          }

          const existingData = workflowInstance.getRunData(workflowRun.runId);
          if (!existingData) throw new Error("This Should not happen");

          // logger.debug("Updating run data for workflow run", workflowRun.runId);
          if (
            workflowInstance.runHasMissingData(existingData) &&
            !workflowInstance.runHasMissingData(workflowRun)
          ) {
            workflowInstance.updateRunData({
              runId: workflowRun.runId,
              runUsageData: workflowRun.usageData!,
            });
          }
        },
      });
      if (newWorkflowRuns.hasFailed) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_load_workflow_data",
            message: newWorkflowRuns.error.message,
            error: newWorkflowRuns.error,
            data: undefined,
          },
        };
      }
      logger.debug(
        `Found ${newWorkflowRuns.data.workflows.length} new workflow runs`
      );

      if (newWorkflowRuns.data.workflows.length === 0) {
        if (loadRetrievedWorkflowDataResponse.hasFailed) {
          return {
            hasFailed: true,
            error: {
              code: "no_workflow_runs_found",
              message: "Did not find any workflow runs",
              error: new Error("NO_WORKFLOW_RUNS_FOUND"),
              data: undefined,
            },
          };
        }

        return {
          hasFailed: false,
          data: workflowInstance,
        };
      }

      if (!loadRetrievedWorkflowDataResponse.hasFailed) {
        for (const [runId, runData] of workflowInstance) {
          if (workflowInstance.runHasMissingData(runData)) {
            const getWorkflowRunsUsageDataResponse =
              await getWorkflowRunsUsageController({
                owner,
                repo,
                workflowRunIds: [runId],
                workflowsMap:
                  loadRetrievedWorkflowDataResponse.data.workflowWeekRunsMap,
              });
            if (getWorkflowRunsUsageDataResponse.hasFailed) {
              console.warn(
                "Failed to fetch workflow run usage data for workflow run"
                  .bgBlack.red,
                runId
              );
              continue;
            }

            const usageData = getWorkflowRunsUsageDataResponse.data[runId];
            if (!usageData) continue;

            const getAllJobsByIdsResponse = await getAllJobsByIds({
              owner,
              repo,
              workflowJobIds: getJobsArray(usageData).map((job) => job.jobId),
            });
            if (getAllJobsByIdsResponse.hasFailed) {
              console.warn(
                "Failed to fetch jobs data for workflow run".bgBlack.red,
                runId
              );
              workflowInstance.updateRunData({
                runId,
                runUsageData: usageData,
              });

              continue;
            }

            workflowInstance.updateRunData({
              runId,
              runUsageData: updateJobsDataFromMap({
                jobsMap: getAllJobsByIdsResponse.data.jobsMap,
                usageData,
              }),
            });
          }
        }
      }

      const save = await retrievedWorkflowService.saveRetrievedWorkflowData(
        workflowInstance.serializableData,
        {
          overwrite: true,
        }
      );

      if (save.hasFailed) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_save_workflow_data",
            message: save.error.message,
            error: save.error,
            data: undefined,
          },
        };
      }
      return {
        hasFailed: false,
        data: workflowInstance,
      };
    };
  };
