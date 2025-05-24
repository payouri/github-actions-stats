import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import type { MethodResult } from "../../../types/MethodResult.js";

export type BuildGetRunDataRequestDependencies = {
  githubClient: GithubApi["rest"];
  onBeforeRequest?: (index: number, total: number) => Promise<void> | void;
  onAfterRequest?: (index: number, total: number) => Promise<void> | void;
};

export type GetRunDataRequestParams = {
  workflowRunId: number;
  owner: string;
  repo: string;
};

export type GetRunDataRequestResponse = MethodResult<
  components["schemas"]["workflow-run"],
  "failed_to_fetch_jobs_data"
>;

export type GetRunDataRequest = (
  params: GetRunDataRequestParams
) => Promise<GetRunDataRequestResponse>;

export type BuildGetRunDataRequest = (
  dependencies: BuildGetRunDataRequestDependencies
) => GetRunDataRequest;

export const buildGetRunData = (
  dependencies: BuildGetRunDataRequestDependencies
): GetRunDataRequest => {
  const { githubClient, onAfterRequest, onBeforeRequest } = dependencies;

  return async function getRunData(
    params: GetRunDataRequestParams
  ): Promise<GetRunDataRequestResponse> {
    const { workflowRunId, owner, repo } = params;

    try {
      onBeforeRequest?.(0, 1);
      const response = await githubClient.actions.getWorkflowRun({
        owner,
        repo,
        run_id: workflowRunId,
      });
      onAfterRequest?.(0, 1);

      if (!response.status || response.status >= 400) {
        const message = `Request failed with status ${response.status}`;
        return {
          hasFailed: true,
          error: {
            code: "failed_to_fetch_jobs_data",
            message: `Request failed with status ${response.status}`,
            error: new Error(message, {
              cause: response.status,
            }),
            data: response,
          },
        };
      }

      return {
        hasFailed: false,
        data: response.data,
      };
    } catch (err) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_fetch_jobs_data",
          message: "Failed to fetch jobs data",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to fetch workflow job data", {
                  cause: err,
                }),
          data: undefined,
        },
      };
    }
  };
};
