import type { Octokit } from "octokit";
import type { MethodResult } from "../../types/MethodResult.js";
import type { GetRateLimitRequest } from "./requests/getRateLimit.js";
import type { WorkFlowInstance } from "../../cli/entities/RetrievedWorkflowData/types.js";

export type RequestsManagerParams = {
  octokit: Octokit;
};

export type RequestsManager = {
  getRepoWorkflowData: (
    params: {
      repositoryName: string;
      repositoryOwner: string;
      workflowName: string;
      branchName?: string;
    },
    options?: {
      filePath?: string;
    }
  ) => Promise<
    MethodResult<
      WorkFlowInstance,
      "repo_not_found" | "workflow_not_found" | "failed_to_load_workflow_data"
    >
  >;
  /** @returns The GitHub rate limit for the current account */
  getRateLimit: GetRateLimitRequest;
};
