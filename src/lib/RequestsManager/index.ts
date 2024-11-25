import {
  buildGetAllJobsByIds,
  buildGetAllWorkflowsController,
  buildGetRetrievedWorkflowDataController,
  buildGetWorkflowRunsUsageController,
} from "controllers/index.js";
import { getFormattedWorkflowRun } from "helpers/getFormattedWorkflowRun.js";
import type { RequestsManagerParams, RequestsManager } from "./types.js";

export const buildRequestsManager = (
  params: RequestsManagerParams
): RequestsManager => {
  const { octokit } = params;

  const getAllWorkflowsRunsController = buildGetAllWorkflowsController({
    githubClient: octokit.rest,
    formatWorkflow: getFormattedWorkflowRun,
    onPage: ({ page, total, perPage }) => {
      console.log(
        !total
          ? `Fetched page ${page} but found no workflow`
          : `Fetched page ${page}/${Math.ceil(total / perPage)} (${Math.min(
              Math.max(0, ((page * perPage) / total) * 100),
              100
            ).toFixed(2)}%)`
      );
    },
    transformWorkflow: async ({ workflow, owner, repo }) => {
      if (workflow.status !== "completed") return workflow;
      console.log("Fetching usage data for run", workflow.runId);
      if (!workflow.usageData) {
        const response = await octokit.rest.actions.getWorkflowRunUsage({
          owner,
          repo,
          run_id: workflow.runId,
        });
        if (!response?.data?.billable) return workflow;

        workflow.usageData = response.data;
      }

      let fetchedJobsCount = 0;
      for (const [_, osData] of Object.entries(workflow.usageData.billable)) {
        if (!osData || !osData.jobs || !osData.job_runs) continue;

        for (const [_, job] of osData.job_runs.entries()) {
          if (job.data) continue;

          const response = await octokit.rest.actions.getJobForWorkflowRun({
            owner,
            repo,
            job_id: job.job_id,
          });

          fetchedJobsCount += 1;
          if (!response.data) continue;

          job.data = response.data;
        }
      }
      if (fetchedJobsCount === 0) {
        console.log("No jobs fetched for workflow", workflow.runId);
      } else {
        console.log(
          `Fetched ${fetchedJobsCount.toString().yellow} jobs for workflow`
            .bgBlack.white,
          workflow.runId
        );
      }

      return workflow;
    },
  });

  const getWorkflowRunsUsageController = buildGetWorkflowRunsUsageController({
    githubClient: octokit.rest,
    sleepConfig: {
      everyIteration: 100,
      ms: 1000,
    },
    onBeforeRequest: (index, total) => {
      console.log("Fetching workflow runs usage", `${index}/${total}`);
    },
  });

  const getAllJobsByIds = buildGetAllJobsByIds({
    githubClient: octokit.rest,
    onBeforeRequest: (index, total) => {
      console.log("Fetching job data", `${index}/${total}`);
    },
  });

  const getRetrievedWorkflowDataController =
    buildGetRetrievedWorkflowDataController({
      getWorkflowRunsUsageController,
      getAllWorkflowsController: getAllWorkflowsRunsController,
      getAllJobsByIds,
    });

  const getRepoWorkflowData: RequestsManager["getRepoWorkflowData"] = async (
    params,
    options
  ) => {
    const { repositoryName, repositoryOwner, workflowName, branchName } =
      params;
    console.log("Fetching Repo Data...".bgBlack.yellow);
    const [repoData, repoWorkflowsResponse] = await Promise.all([
      octokit.rest.repos.get({
        owner: repositoryOwner,
        repo: repositoryName,
      }),
      octokit.rest.actions.listRepoWorkflows({
        owner: repositoryOwner,
        repo: repositoryName,
      }),
    ]);

    if (!repoData.data) {
      return {
        hasFailed: true,
        error: {
          code: "repo_not_found",
          message: `Repository ${params.repositoryName} not found`,
        },
      };
    }
    if (
      !repoWorkflowsResponse.data ||
      !repoWorkflowsResponse.data.workflows ||
      repoWorkflowsResponse.data.total_count === 0
    ) {
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message: `Workflow ${params.workflowName} not found`,
        },
      };
    }

    const workflowData = repoWorkflowsResponse.data.workflows.find(
      (workflow) => workflow.name === workflowName
    );
    if (!workflowData) {
      return {
        hasFailed: true,
        error: {
          code: "workflow_not_found",
          message: `Workflow ${params.workflowName} not found`,
        },
      };
    }

    const getRetrievedWorkflowDataResponse =
      await getRetrievedWorkflowDataController({
        owner: repoData.data.owner.login,
        repo: repoData.data.name,
        branchName,
        workflowName: workflowData.name,
        workflowId: workflowData.id,
        saveRunsEvery: 10,
        filePath: options?.filePath,
      });
    if (getRetrievedWorkflowDataResponse.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_load_workflow_data",
          message: getRetrievedWorkflowDataResponse.error.message,
        },
      };
    }

    return {
      hasFailed: false,
      data: getRetrievedWorkflowDataResponse.data,
    };
  };

  const getRateLimit: RequestsManager["getRateLimit"] = async () => {
    const response = await octokit.rest.rateLimit.get();

    if (response.status >= 400) {
      return {
        hasFailed: true,
        error: {
          code: response.status,
          message: "Failed to fetch GitHub rate limit",
        },
      };
    }

    return {
      hasFailed: false,
      data: response.data.rate,
    };
  };

  return {
    getRepoWorkflowData,
    getRateLimit,
  };
};
