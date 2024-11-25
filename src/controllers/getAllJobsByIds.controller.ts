import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import { RunJobData } from "entities/index.js";

export type BuildGetAllJobsByIdsControllerDependencies = {
  githubClient: GithubApi["rest"];
  sleepConfig?: { ms: number; everyIteration: number };
  onBeforeRequest?: (index: number, total: number) => void;
  onAfterRequest?: (index: number, total: number) => void;
};

export type GetAllJobsByIdsControllerParams = {
  owner: string;
  repo: string;
  workflowJobIds: number[];
  runDataMap?: Record<number, RunJobData>;
};

export type GetAllJobsByIdsControllerResponse =
  | {
      hasFailed: false;
      data: {
        total: number;
        jobsMap: { [k: number]: components["schemas"]["job"] };
      };
    }
  | {
      hasFailed: true;
      error: Error;
    };

export type GetAllJobsByIdsController = (
  params: GetAllJobsByIdsControllerParams
) => Promise<GetAllJobsByIdsControllerResponse>;

export type BuildGetAllJobsByIdsController = (
  dependencies: BuildGetAllJobsByIdsControllerDependencies
) => GetAllJobsByIdsController;

export const buildGetAllJobsByIds: BuildGetAllJobsByIdsController = (
  dependencies
) => {
  const {
    githubClient,
    onAfterRequest,
    onBeforeRequest,
    sleepConfig = {
      everyIteration: 100,
      ms: 1000,
    },
  } = dependencies;

  return async (params) => {
    const { owner, repo, workflowJobIds, runDataMap } = params;

    const jobsMap: Record<number, components["schemas"]["job"]> = {};

    try {
      for (let i = 0, n = workflowJobIds.length; i < n; i += 1) {
        const jobId = workflowJobIds[i];
        if (jobId in jobsMap) {
          continue;
        }

        onBeforeRequest?.(i, n);

        const d = (runDataMap ?? {})[jobId];

        if (d) {
          jobsMap[d.id] = d;
          continue;
        }

        const response = await githubClient.actions.getJobForWorkflowRun({
          owner,
          repo,
          job_id: jobId,
        });

        onAfterRequest?.(i, n);

        jobsMap[jobId] = response.data;
        if (
          i % sleepConfig.everyIteration === 0 &&
          i > 0 &&
          i < workflowJobIds.length - 1 &&
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
        error: new Error("Failed to fetch workflow job data", {
          cause: err,
        }),
      };
    }

    return {
      hasFailed: false,
      data: {
        total: 0,
        jobsMap,
      },
    };
  };
};