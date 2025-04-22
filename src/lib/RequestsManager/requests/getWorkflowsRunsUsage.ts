import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import { RetrievedWorkflow } from "../../../cli/entities/RetrievedWorkflowData/types.js";
import { getJobsArray } from "../../../entities/FormattedWorkflow/helpers/getJobsArray.js";
import type { RunUsageData } from "../../../entities/FormattedWorkflow/types.js";
import { formatGithubUsageDataToLocalUsageData } from "../../../helpers/format/formatGithubUsageDataToLocalUsageData.js";
import type { MethodResult } from "../../../types/MethodResult.js";
import { DEFAULT_SLEEP_CONFIG } from "./constants.js";

export type GetWorkflowRunsUsageRequestDependencies = {
  githubClient: GithubApi["rest"];
  sleepConfig?: { ms: number; everyIteration: number };
  onBeforeRequest?: (index: number, total: number) => Promise<void> | void;
  onAfterRequest?: (index: number, total: number) => Promise<void> | void;
  onCacheHit?: (index: number, total: number) => Promise<void> | void;
};

export type GetWorkflowRunsUsageRequestParams = {
  owner: string;
  repo: string;
  workflowRunIds: number[];
  cachedWorkflowsMap?: RetrievedWorkflow["workflowWeekRunsMap"];
};

export type GetWorkflowRunsUsageRequestResponse = MethodResult<
  { usage: Record<number, RunUsageData>; total: number; jobsIds: number[] },
  "failed_to_fetch_workflow_runs_usage"
>;

export type GetWorkflowRunsUsageRequest = (
  params: GetWorkflowRunsUsageRequestParams
) => Promise<GetWorkflowRunsUsageRequestResponse>;

export const buildGetWorkflowRunsUsageRequest = (
  dependencies: GetWorkflowRunsUsageRequestDependencies
) => {
  const {
    githubClient,
    sleepConfig = DEFAULT_SLEEP_CONFIG,
    onBeforeRequest,
    onAfterRequest,
    onCacheHit,
  } = dependencies;

  return async function getWorkflowsRunsUsage(
    params: GetWorkflowRunsUsageRequestParams
  ): Promise<GetWorkflowRunsUsageRequestResponse> {
    const {
      owner,
      repo,
      workflowRunIds,
      cachedWorkflowsMap: workflowsMap,
    } = params;

    const workflowRunsUsageData: Record<number, RunUsageData> = {};
    const jobsIds = new Set<number>();
    const hasCachedWorkflowsMap = Boolean(
      workflowsMap && Object.keys(workflowsMap).length > 0
    );
    let totalWorkflowRunsUsageCount = 0;

    try {
      for (let i = 0, n = workflowRunIds.length; i < n; i += 1) {
        const runId = workflowRunIds[i];
        const cachedRun = hasCachedWorkflowsMap
          ? Object.values(workflowsMap ?? {}).find((v) =>
              v.find(
                (w) =>
                  w.runId === runId && w.usageData && w.status === "completed"
              )
            )
          : null;

        await onBeforeRequest?.(i, n);

        if (cachedRun) {
          const cachedData = cachedRun.find((w) => w.runId === runId)
            ?.usageData!;
          workflowRunsUsageData[runId] = cachedData;
          totalWorkflowRunsUsageCount += 1;
          getJobsArray(cachedData).forEach((job) => {
            jobsIds.add(job.jobId);
          });

          await onCacheHit?.(i, n);
          continue;
        }

        const response = await githubClient.actions.getWorkflowRunUsage({
          owner,
          repo,
          run_id: runId,
        });
        totalWorkflowRunsUsageCount += 1;
        workflowRunsUsageData[Number(runId)] =
          formatGithubUsageDataToLocalUsageData(response.data);

        getJobsArray(workflowRunsUsageData[runId]).forEach((job) => {
          jobsIds.add(job.jobId);
        });

        await onAfterRequest?.(i, n);

        const isLastRun = i === workflowRunIds.length - 1;
        const isLastIteration = i === n - 1;
        const hasSleepValue = sleepConfig.ms > 0;
        const isIterarion = i % sleepConfig.everyIteration === 0;
        const shouldSleep =
          !isLastRun && !hasSleepValue && isIterarion && !isLastIteration;

        if (shouldSleep) {
          await new Promise((resolve) => {
            setTimeout(resolve, sleepConfig.ms);
          });
        }
      }
    } catch (err) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_fetch_workflow_runs_usage",
          message: "Failed to fetch workflow runs usage",
          error:
            err instanceof Error
              ? err
              : new Error("Failed to fetch workflow runs usage", {
                  cause: err,
                }),
          data: workflowRunsUsageData,
        },
      };
    }

    return {
      hasFailed: false,
      data: {
        usage: workflowRunsUsageData,
        total: totalWorkflowRunsUsageCount,
        jobsIds: Array.from(jobsIds),
      },
    };
  };
};
