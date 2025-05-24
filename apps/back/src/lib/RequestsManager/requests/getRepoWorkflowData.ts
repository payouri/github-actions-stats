import type { components } from "@octokit/openapi-types";
import type { Octokit } from "octokit";
import type { MethodResult } from "../../../types/MethodResult.js";

export type BuildGetRepoWorkflowDataRequestDependencies = {
  octokit: Octokit["rest"];
  onBeforeRequest?: () => Promise<void> | void;
  onAfterRequest?: () => Promise<void> | void;
};

export type GetRepoWorkflowDataRequestParams = {
  repositoryName: string;
  repositoryOwner: string;
  workflowName: string;
};

export type GetRepoWorkflowDataRequestResponse = MethodResult<
  {
    repository: components["schemas"]["full-repository"];
    workflows: {
      totalCount: number;
      page: components["schemas"]["workflow"][];
      workflow: components["schemas"]["workflow"];
    };
  },
  "repo_not_found" | "workflow_not_found" | "failed_to_load_workflow_data"
>;

export type GetRepoWorkflowDataRequest = (
  params: GetRepoWorkflowDataRequestParams
) => Promise<GetRepoWorkflowDataRequestResponse>;

export function buildGetRepoWorkflowDataRequest(
  dependencies: BuildGetRepoWorkflowDataRequestDependencies
) {
  const { octokit, onAfterRequest, onBeforeRequest } = dependencies;

  return async function getRepoWorkflowDataRequest(
    params: GetRepoWorkflowDataRequestParams
  ): Promise<GetRepoWorkflowDataRequestResponse> {
    const { repositoryName, repositoryOwner, workflowName } = params;

    await onBeforeRequest?.();
    const [repoData, repoWorkflowsResponse] = await Promise.all([
      octokit.repos.get({
        owner: repositoryOwner,
        repo: repositoryName,
      }),
      octokit.actions.listRepoWorkflows({
        owner: repositoryOwner,
        repo: repositoryName,
      }),
    ]);

    if (!repoData.data) {
      const message = `Repository ${params.repositoryName} not found`;
      return {
        hasFailed: true,
        error: {
          code: "repo_not_found",
          message,
          data: repoData.data,
          error: new Error(message),
        },
      };
    }
    if (
      !repoWorkflowsResponse.data ||
      !repoWorkflowsResponse.data.workflows ||
      repoWorkflowsResponse.data.total_count === 0
    ) {
      const message = `Workflow ${params.workflowName} not found`;
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message,
          data: repoWorkflowsResponse.data,
          error: new Error(message),
        },
      };
    }

    const workflowData = repoWorkflowsResponse.data.workflows.find(
      (workflow) => workflow.name === workflowName
    );
    if (!workflowData) {
      const message = `Workflow ${params.workflowName} not found`;
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message,
          data: workflowData,
          error: new Error(message),
        },
      };
    }
    await onAfterRequest?.();

    return {
      hasFailed: false,
      data: {
        repository: repoData.data,
        workflows: {
          totalCount: repoWorkflowsResponse.data.total_count,
          page: repoWorkflowsResponse.data.workflows,
          workflow: workflowData,
        },
      },
    };
  };
}
