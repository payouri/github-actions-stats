import dayjs from "dayjs";
import type { Octokit } from "octokit";
import { buildFetchWorkflowUpdatesController } from "../../controllers/fetchWorkflowUpdates.js";
import { isWorkflowInstance } from "../../entities/RetrievedWorkflowData/helpers.js";
import { createWorkflowInstance } from "../../entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "../../entities/RetrievedWorkflowData/types.js";
import logger from "../../lib/Logger/logger.js";
import type { MethodResult } from "../../types/MethodResult.js";
import type { LoadWorkflowDataMethod } from "./methods/loadWorkflowData.js";
import type { SaveWorkflowDataMethod } from "./methods/saveWorkflowData.js";

export type BuildGetWorkflowInstaceDependencies = {
  githubClient: Octokit["rest"];
  loadWorkflowData: LoadWorkflowDataMethod;
  saveWorkflowData: SaveWorkflowDataMethod;
};

export type GetWorkflowInstanceParams = {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
};

export type GetWorkflowInstanceOptions = {
  withoutUpdate?: boolean;
};

export type GetWorkflowInstanceResponse = Promise<
  MethodResult<
    WorkFlowInstance,
    | "failed_to_load_workflow_data"
    | "failed_to_save_workflow_data"
    | "failed_to_update_workflow_data"
  >
>;

export function buildGetWorkflowInstance(
  dependencies: BuildGetWorkflowInstaceDependencies
) {
  const { loadWorkflowData, saveWorkflowData, githubClient } = dependencies;

  const fetchWorkflowUpdatesController = buildFetchWorkflowUpdatesController({
    githubClient,
    saveWorkflowData,
    workflowPerPage: 10,
    onPage: ({ page, total, perPage }) => {
      logger.debug(
        !total
          ? `Fetched page ${page} but found no workflow`
          : `Fetched page ${page}/${Math.ceil(total / perPage)} (${Math.min(
              Math.max(0, ((page * perPage) / total) * 100),
              100
            ).toFixed(2)}%)`
      );
    },
  });

  return async function getWorkflowInstance(
    params: GetWorkflowInstanceParams,
    options?: GetWorkflowInstanceOptions
  ): GetWorkflowInstanceResponse {
    const { workflowName, repositoryName, repositoryOwner, branchName } =
      params;
    const { withoutUpdate = false } = options ?? {};

    if (withoutUpdate) {
      const workflowDataResponse = await loadWorkflowData({
        workflowName,
        repositoryName,
        repositoryOwner,
        branchName,
      });
      if (workflowDataResponse.hasFailed) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_load_workflow_data",
            error: workflowDataResponse.error.error,
            message: workflowDataResponse.error.message,
            data: workflowDataResponse.error.data,
          },
        };
      }

      return {
        hasFailed: false,
        data: isWorkflowInstance(workflowDataResponse.data)
          ? workflowDataResponse.data
          : createWorkflowInstance(workflowDataResponse.data),
      };
    }

    const workflowDataResponse = await loadWorkflowData({
      workflowName,
      repositoryName,
      repositoryOwner,
      branchName,
    });

    if (workflowDataResponse.hasFailed) {
      return workflowDataResponse;
    }

    const workflowData = isWorkflowInstance(workflowDataResponse.data)
      ? workflowDataResponse.data
      : createWorkflowInstance(workflowDataResponse.data);

    const workflowUpdatesResponse = await fetchWorkflowUpdatesController({
      workflowInstance: workflowData,
      updateType: dayjs(workflowData.oldestRunAt).isSame(
        dayjs(workflowData.lastRunAt)
      )
        ? "oldest"
        : "newest",
    });

    if (workflowUpdatesResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_update_workflow_data",
          message: "Failed to update workflow data",
          error: workflowUpdatesResponse.error.error,
          data: workflowUpdatesResponse.error.data,
        },
      };
    }

    // const saveResult = await saveWorkflowData({
    //   workflowName,
    //   repositoryName,
    //   repositoryOwner,
    //   branchName,
    //   workflowData,
    // });

    // if (saveResult.hasFailed) {
    //   return {
    //     hasFailed: true,
    //     error: {
    //       code: "failed_to_save_workflow_data",
    //       message: "Failed to save workflow data",
    //       error: saveResult.error.error,
    //       data: saveResult.error.data,
    //     },
    //   };
    // }

    return {
      hasFailed: false,
      data: workflowData,
    };
  };
}
