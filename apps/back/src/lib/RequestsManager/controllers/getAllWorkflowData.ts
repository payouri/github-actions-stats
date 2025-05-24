import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import type { MethodResult } from "../../../types/MethodResult.js";

export type BuildGetWorkflowRunDataByIdControllerDependencies = {
  githubClient: GithubApi["rest"];
  throwOnJobError?: boolean;
};

export type GetWorkflowRunDataByIdControllerParams = {
  repo: string;
  owner: string;
  workflowRunId: number;
};

type GetWorkflowRunDataByIdControllerResponseData = {
  runData: components["schemas"]["workflow-run"];
  usageData: components["schemas"]["workflow-run-usage"];
  jobsData: {
    id: number;
    run_id: number;
    osName: string;
    data: components["schemas"]["job"];
  }[];
};
export type GetWorkflowRunDataByIdControllerResponse = MethodResult<
  GetWorkflowRunDataByIdControllerResponseData,
  | "failed_to_fetch_workflow_run_data"
  | "no_workflow_runs_found"
  | "failed_to_fetch_workflow_run"
  | "failed_to_fetch_job_data"
  | "failed_to_fetch_workflow_run_usage"
>;

export type GetAllWorkflowsController = (
  params: GetWorkflowRunDataByIdControllerParams
) => Promise<GetWorkflowRunDataByIdControllerResponse>;

export const buildGetAllWorkflowsController = (
  dependencies: BuildGetWorkflowRunDataByIdControllerDependencies
) => {
  const { githubClient, throwOnJobError = false } = dependencies;

  return async (
    params: GetWorkflowRunDataByIdControllerParams
  ): Promise<GetWorkflowRunDataByIdControllerResponse> => {
    const { workflowRunId, repo, owner } = params;

    try {
      const response = await githubClient.actions.getWorkflowRun({
        repo,
        owner,
        run_id: workflowRunId,
      });

      if (!response.status || response.status >= 400) {
        const message = `Request failed with status ${response.status}`;
        return {
          hasFailed: true,
          error: {
            code: "failed_to_fetch_workflow_run",
            message: `Request failed with status ${response.status}`,
            error: new Error(message, {
              cause: response.status,
            }),
            data: response,
          },
        };
      }

      const { data: runData } = response;

      const usageResponse = await githubClient.actions.getWorkflowRunUsage({
        owner,
        repo,
        run_id: workflowRunId,
      });
      if (!usageResponse.status || usageResponse.status >= 400) {
        const message = `Request failed with status ${usageResponse.status}`;
        return {
          hasFailed: true,
          error: {
            code: "failed_to_fetch_workflow_run_usage",
            message: `Request failed with status ${usageResponse.status}`,
            error: new Error(message, {
              cause: usageResponse.status,
            }),
            data: usageResponse,
          },
        };
      }

      const { data: usageData } = usageResponse;
      const jobsData: Exclude<
        GetWorkflowRunDataByIdControllerResponse,
        {
          hasFailed: true;
        }
      >["data"]["jobsData"] = [];

      for (const [osName, osData] of Object.entries(usageData.billable)) {
        if (!osData || !osData.jobs || !osData.job_runs) continue;

        for (const jobRun of osData.job_runs) {
          const jobResponse = await githubClient.actions.getJobForWorkflowRun({
            job_id: jobRun.job_id,
            owner,
            repo,
          });

          if (!jobResponse.status || jobResponse.status >= 400) {
            if (throwOnJobError) {
              const message = `Request failed with status ${jobResponse.status}`;
              return {
                hasFailed: true,
                error: {
                  code: "failed_to_fetch_job_data",
                  message: `Request failed with status ${jobResponse.status}`,
                  error: new Error(message, {
                    cause: jobResponse.status,
                  }),
                  data: jobResponse,
                },
              };
            }
            console.warn(`Failed to fetch job data for job ${jobRun.job_id}`);
            continue;
          }

          jobsData.push({
            data: jobResponse.data,
            id: jobRun.job_id,
            osName,
            run_id: workflowRunId,
          });
        }
      }

      return {
        hasFailed: false,
        data: {
          runData,
          usageData,
          jobsData,
        },
      };
    } catch (err) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_fetch_workflow_run_data",
          message: "Failed to fetch workflow run data",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to fetch workflow run data", {
                  cause: err,
                }),
          data: undefined,
        },
      };
    }
  };
};
