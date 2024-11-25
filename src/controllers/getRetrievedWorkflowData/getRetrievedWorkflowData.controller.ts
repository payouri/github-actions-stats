import type { components } from "@octokit/openapi-types";
import "colors";
import type { GetAllJobsByIdsController } from "controllers/getAllJobsByIds.controller.js";
import type { GetWorkflowRunsUsageController } from "controllers/getWorkflowRunsUsage.controller.js";
import { getJobsArray } from "entities/FormattedWorkflow/helpers/getJobsArray.js";
import { updateJobsDataFromMap } from "entities/FormattedWorkflow/helpers/updateJobsDataFromMap.js";
import type { FormattedWorkflowRun } from "entities/index.js";
import { retrievedWorkflowService } from "entities/RetrievedWorkflowData/index.js";
import { createWorkflowInstance } from "entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "entities/RetrievedWorkflowData/types.js";
import type { ProcessResponse } from "ProcessResponse.types.js";
import type { GetAllWorkflowsController } from "../getAllWorkflowRuns.controller.js";

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

export type GetRetrievedWorkflowDataControllerResponse =
  ProcessResponse<WorkFlowInstance>;

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
        saveRunsEvery,
        filePath: filePathParam,
      } = params;

      const filePath =
        filePathParam ||
        retrievedWorkflowService.getDefaultFilePath({
          workflowName,
          workflowParams: {
            owner,
            repo,
            branchName,
          },
        });
      const loadRetrievedWorkflowDataResponse =
        await retrievedWorkflowService.loadRetrievedWorkflowData(filePath);

      console.log("Loading workflow data located at", filePath.bold);
      if (
        loadRetrievedWorkflowDataResponse.hasFailed &&
        ["FILE_DOES_NOT_EXIST", "FAILED_TO_LOAD_WORKFLOW_DATA"].includes(
          loadRetrievedWorkflowDataResponse.error.message
        ) === false
      ) {
        return {
          hasFailed: true,
          error: loadRetrievedWorkflowDataResponse.error,
        };
      }

      const workflowInstance = createWorkflowInstance(
        loadRetrievedWorkflowDataResponse.hasFailed
          ? {
              lastRunAt: new Date().toISOString(),
              lastUpdatedAt: new Date().toISOString(),
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

      console.log("Retrieving new workflow runs...".bgBlack.yellow);
      const newWorkflowRuns = await getAllWorkflowsController({
        owner,
        repo,
        workflowId,
        branchName,
        workflowStatus: "completed",
        createdAfter: !loadRetrievedWorkflowDataResponse.hasFailed
          ? workflowInstance.lastRunAt
          : undefined,
        onFinalWorkflow: (workflowRun) => {
          if (!workflowInstance.isExistingRunData(workflowRun.runId)) {
            // console.log("Adding run data for workflow run", workflowRun.runId);
            workflowInstance.addRunData({
              runId: workflowRun.runId,
              runData: workflowRun,
            });
            return;
          }

          const existingData = workflowInstance.getRunData(workflowRun.runId);
          if (!existingData) throw new Error("This Should not happen");

          // console.log("Updating run data for workflow run", workflowRun.runId);
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
          error: newWorkflowRuns.error,
        };
      }
      console.log(
        `Found ${newWorkflowRuns.data.workflows.length} new workflow runs`
      );

      if (newWorkflowRuns.data.workflows.length === 0) {
        if (loadRetrievedWorkflowDataResponse.hasFailed) {
          return {
            hasFailed: true,
            error: new Error("NO_WORKFLOW_RUNS_FOUND"),
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
        return save;
      }
      return {
        hasFailed: false,
        data: workflowInstance,
      };
    };
  };
