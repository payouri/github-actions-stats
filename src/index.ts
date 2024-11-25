import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration.js";
import { retrievedWorkflowService } from "entities/RetrievedWorkflowData/index.js";
import { createWorkflowInstance } from "entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import { WorkFlowInstance } from "entities/RetrievedWorkflowData/types.js";
import { createDirIfNotExists } from "helpers/createDirIfNotExists.js";
import { buildRequestsManager } from "lib/RequestsManager/index.js";
import { RequestsManager } from "lib/RequestsManager/types.js";
import { WorkflowsStats, WorkflowStats } from "lib/Stat/index.js";
import {
  AggregatedStats,
  GetAveragesByPeriodOptions,
} from "lib/Stat/methods/getAveragesByPeriod.js";
import { writeFile } from "node:fs/promises";
import { Octokit } from "octokit";

dayjs.extend(durationPlugin);

export type BuildGithubStatsModuleParams = {
  githubToken: string;
};

export type GithubStatsModule = {
  getDefaultFilePath: (params: {
    workflowName: string;
    workflowParams: {
      owner: string;
      repo: string;
      branchName?: string;
    };
  }) => string;
  getWorkflowInstance: (
    params: {
      workflowName: string;
      repositoryName: string;
      repositoryOwner: string;
      branchName?: string;
    },
    options?: {
      localOnly?: boolean;
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
  getWorkflowStats: (
    params:
      | {
          workflowName: string;
          repositoryName: string;
          repositoryOwner: string;
          branchName?: string;
        }
      | WorkFlowInstance,
    options?: {
      localOnly?: boolean;
      filePath?: string;
    }
  ) => Promise<
    | {
        hasFailed: false;
        data: WorkflowsStats;
      }
    | {
        hasFailed: true;
        error: {
          code: string;
          message: string;
        };
      }
  >;
  saveWorkflowStats: (
    params: WorkflowsStats | AggregatedStats,
    options: {
      filePath: string;
    }
  ) => Promise<
    | {
        hasFailed: false;
      }
    | {
        hasFailed: true;
        error: {
          code: string;
          message: string;
        };
      }
  >;
  getAggregatedStats: (
    params: WorkflowsStats,
    options: GetAveragesByPeriodOptions
  ) =>
    | {
        hasFailed: false;
        data: AggregatedStats;
      }
    | {
        hasFailed: true;
        error: {
          code: string;
          message: string;
        };
      };
  getRateLimit: RequestsManager["getRateLimit"];
};

export type BuildGithubStatsModule = (
  params: BuildGithubStatsModuleParams
) => GithubStatsModule;

export const buildGithubStatsModule: BuildGithubStatsModule = (params) => {
  const { githubToken } = params;

  const octokit = new Octokit({
    auth: githubToken,
  });
  const requestsManager = buildRequestsManager({
    octokit,
  });

  const getWorkflowInstance: GithubStatsModule["getWorkflowInstance"] = async (
    params,
    options
  ) => {
    const { workflowName, repositoryName, repositoryOwner, branchName } =
      params;
    const { localOnly = false, filePath: filePathParam } = options ?? {};

    const filePath =
      filePathParam ||
      retrievedWorkflowService.getDefaultFilePath({
        workflowName,
        workflowParams: {
          owner: repositoryOwner,
          repo: repositoryName,
          branchName,
        },
      });
    if (localOnly) {
      const workflowDataResponse =
        await retrievedWorkflowService.loadRetrievedWorkflowData(filePath);
      if (workflowDataResponse.hasFailed) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_load_workflow_data",
            message: workflowDataResponse.error.message,
          },
        };
      }

      return {
        hasFailed: false,
        data: createWorkflowInstance(workflowDataResponse.data),
      };
    }

    const workflowDataResponse = await requestsManager.getRepoWorkflowData(
      {
        repositoryName,
        repositoryOwner,
        workflowName,
        branchName,
      },
      {
        filePath,
      }
    );

    return workflowDataResponse;
  };

  const getWorkflowStats: GithubStatsModule["getWorkflowStats"] = async (
    params,
    options
  ) => {
    const { localOnly = false, filePath: filePathParam } = options ?? {};

    const filePath =
      filePathParam ||
      retrievedWorkflowService.getDefaultFilePath({
        workflowName: params.workflowName,
        workflowParams: {
          owner: params.repositoryOwner,
          repo: params.repositoryName,
          branchName: params.branchName,
        },
      });

    if (localOnly) {
      const workflowInstance = "workflowWeekRunsMap" in params ? params : null;
      const workflowDataResponse = await ("workflowWeekRunsMap" in params
        ? null
        : retrievedWorkflowService.loadRetrievedWorkflowData(filePath));

      if (workflowDataResponse?.hasFailed) {
        return {
          hasFailed: true,
          error: {
            code: "failed_to_load_workflow_data",
            message: workflowDataResponse.error.message,
          },
        };
      }
      if (workflowInstance === null && workflowDataResponse === null) {
        // this should never happen
        throw new Error("No workflow data found");
      }

      return {
        hasFailed: false,
        data: WorkflowStats.getWorkflowStats(
          workflowInstance ?? createWorkflowInstance(workflowDataResponse!.data)
        ),
      };
    }

    const workflowInstanceResponse = await requestsManager.getRepoWorkflowData(
      {
        repositoryName: params.repositoryName,
        repositoryOwner: params.repositoryOwner,
        workflowName: params.workflowName,
        branchName: params.branchName,
      },
      {
        filePath,
      }
    );

    if (workflowInstanceResponse.hasFailed) {
      return workflowInstanceResponse;
    }

    return {
      hasFailed: false,
      data: WorkflowStats.getWorkflowStats(workflowInstanceResponse.data),
    };
  };

  const saveWorkflowStats: GithubStatsModule["saveWorkflowStats"] = async (
    stats,
    options
  ) => {
    const { filePath: filePathParam } = options;

    try {
      await createDirIfNotExists(filePathParam);
      await writeFile(
        filePathParam,
        JSON.stringify(
          stats,
          (_, value) => {
            if (value instanceof Map) {
              return Object.fromEntries(value);
            }
            if (value instanceof Set) {
              return Array.from(value);
            }
            return value;
          },
          2
        ),
        { encoding: "utf-8" }
      );

      return {
        hasFailed: false,
      };
    } catch (error) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_save_workflow_stats",
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  };

  const getAggregatedStats: GithubStatsModule["getAggregatedStats"] = (
    stats,
    options
  ) => {
    return {
      hasFailed: false,
      data: WorkflowStats.getAveragesByPeriod(stats, options),
    };
  };

  return {
    getAggregatedStats,
    getWorkflowInstance,
    getWorkflowStats,
    getRateLimit: requestsManager.getRateLimit,
    saveWorkflowStats,
    getDefaultFilePath: retrievedWorkflowService.getDefaultFilePath,
  };
};
