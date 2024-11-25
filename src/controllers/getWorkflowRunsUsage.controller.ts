import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import { RunUsageData } from "entities/index.js";
import { RetrievedWorkflowV1 } from "entities/RetrievedWorkflowData/types.js";

export type GetWorkflowRunsUsageControllerDependencies = {
  githubClient: GithubApi["rest"];
  sleepConfig?: { ms: number; everyIteration: number };
  onBeforeRequest?: (index: number, total: number) => void;
  onAfterRequest?: (index: number, total: number) => void;
};

export type GetWorkflowRunsUsageControllerParams = {
  owner: string;
  repo: string;
  workflowRunIds: number[];
  workflowsMap?: RetrievedWorkflowV1["workflowWeekRunsMap"];
};

export type GetWorkflowRunsUsageControllerResponse =
  | {
      hasFailed: false;
      data: Record<number, RunUsageData>;
    }
  | {
      hasFailed: true;
      error: Error;
    };

export type GetWorkflowRunsUsageController = (
  params: GetWorkflowRunsUsageControllerParams
) => Promise<GetWorkflowRunsUsageControllerResponse>;

export const buildGetWorkflowRunsUsageController = (
  dependencies: GetWorkflowRunsUsageControllerDependencies
) => {
  const {
    githubClient,
    sleepConfig = {
      everyIteration: 100,
      ms: 1000,
    },
    onBeforeRequest,
    onAfterRequest,
  } = dependencies;

  return async (
    params: GetWorkflowRunsUsageControllerParams
  ): Promise<GetWorkflowRunsUsageControllerResponse> => {
    const { owner, repo, workflowRunIds, workflowsMap } = params;

    let workflowRunsUsageData: Record<number, RunUsageData> = {};

    try {
      for (let i = 0, n = workflowRunIds.length; i < n; i += 1) {
        const runId = workflowRunIds[i];
        onBeforeRequest?.(i, n);
        const d = Object.values(workflowsMap ?? {}).find((v) =>
          v.find(
            (w) => w.runId === runId && w.usageData && w.status === "completed"
          )
        );
        if (d) {
          workflowRunsUsageData[runId] = d.find(
            (w) => w.runId === runId
          )?.usageData!;
          continue;
        }

        const response = await githubClient.actions.getWorkflowRunUsage({
          owner,
          repo,
          run_id: runId,
        });

        onAfterRequest?.(i, n);

        const billable: RunUsageData["billable"] = {
          ...(response.data.billable?.MACOS
            ? {
                MACOS: {
                  ...response.data.billable.MACOS,
                  job_runs: (response.data.billable.MACOS.job_runs || []).map(
                    (v) => ({
                      ...v,
                    })
                  ),
                },
              }
            : {}),
          ...(response.data.billable?.UBUNTU
            ? {
                UBUNTU: {
                  ...response.data.billable.UBUNTU,
                  job_runs: (response.data.billable.UBUNTU.job_runs || []).map(
                    (v) => ({
                      ...v,
                    })
                  ),
                },
              }
            : {}),
          ...(response.data.billable?.WINDOWS
            ? {
                WINDOWS: {
                  ...response.data.billable.WINDOWS,
                  job_runs: (response.data.billable.WINDOWS.job_runs || []).map(
                    (v) => ({
                      ...v,
                    })
                  ),
                },
              }
            : {}),
        };

        workflowRunsUsageData[runId] = {
          ...response.data,
          billable,
        };
        if (
          i % sleepConfig.everyIteration === 0 &&
          i > 0 &&
          i < workflowRunIds.length - 1 &&
          sleepConfig.ms > 0
        ) {
          await new Promise((resolve) => {
            setTimeout(resolve, sleepConfig.ms);
          });
        }
      }
    } catch (err) {
      return {
        hasFailed: true,
        error: new Error("Failed to fetch workflow runs usage", {
          cause: err,
        }),
      };
    }

    return {
      hasFailed: false,
      data: workflowRunsUsageData,
    };
  };
};
