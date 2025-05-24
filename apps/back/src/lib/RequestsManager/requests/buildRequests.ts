import type { Octokit } from "octokit";
import { DEFAULT_SLEEP_CONFIG } from "./constants.js";
import { buildGetJobsByIds, type GetJobsByIdsRequest } from "./getJobsByIds.js";
import { buildGetRateLimit, type GetRateLimitRequest } from "./getRateLimit.js";
import {
  buildGetRepoWorkflowDataRequest,
  type GetRepoWorkflowDataRequest,
} from "./getRepoWorkflowData.js";
import { buildGetRunData, type GetRunDataRequest } from "./getRunData.js";
import {
  buildGetWorkflowRunJobs,
  type GetWorkflowRunJobsRequest,
} from "./getWorkflowRunJobs.js";
import {
  buildGetWorkflowRunsUsageRequest,
  type GetWorkflowRunsUsageRequest,
} from "./getWorkflowsRunsUsage.js";
import { functionTimerify } from "./helpers/requestWrappers.js";

export type BuildGithubRequestsDependencies = {
  octokit: Octokit["rest"];
};

export type GithubRequests = {
  getJobsByIds: GetJobsByIdsRequest;
  getRateLimit: GetRateLimitRequest;
  getRepoWorkflowData: GetRepoWorkflowDataRequest;
  getWorkflowRunsUsage: GetWorkflowRunsUsageRequest;
  getRunData: GetRunDataRequest;
  getWorkflowRunJobs: GetWorkflowRunJobsRequest;
};

export const buildGithubRequests = (
  dependencies: BuildGithubRequestsDependencies
): GithubRequests => {
  const { octokit } = dependencies;

  const getRepoWorkflowData = functionTimerify(
    buildGetRepoWorkflowDataRequest({
      octokit: octokit,
    })
  );
  const getRateLimit = functionTimerify(
    buildGetRateLimit({
      githubClient: octokit,
    })
  );
  const getWorkflowRunsUsage = functionTimerify(
    buildGetWorkflowRunsUsageRequest({
      githubClient: octokit,
      sleepConfig: DEFAULT_SLEEP_CONFIG,
    })
  );
  const getJobsByIds = functionTimerify(
    buildGetJobsByIds({
      githubClient: octokit,
      sleepConfig: DEFAULT_SLEEP_CONFIG,
    })
  );
  const getRunData = functionTimerify(
    buildGetRunData({
      githubClient: octokit,
    })
  );
  const getWorkflowRunJobs = functionTimerify(
    buildGetWorkflowRunJobs({
      githubClient: octokit,
    })
  );

  return {
    getRepoWorkflowData,
    getRateLimit,
    getWorkflowRunsUsage,
    getJobsByIds,
    getRunData,
    getWorkflowRunJobs,
  };
};
