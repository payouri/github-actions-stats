import { WorkFlowInstance } from "entities/RetrievedWorkflowData/types.js";
import { components } from "@octokit/openapi-types";
import type { Octokit } from "octokit";

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
    | {
        hasFailed: false;
        data: WorkFlowInstance;
      }
    | {
        hasFailed: true;
        error: {
          code: string;
          message: string;
        };
      }
  >;
  /** @returns The GitHub rate limit for the current account */
  getRateLimit: () => Promise<
    | {
        hasFailed: false;
        data: components["schemas"]["rate-limit"];
      }
    | {
        hasFailed: true;
        error: {
          code: number;
          message: string;
        };
      }
  >;
};
