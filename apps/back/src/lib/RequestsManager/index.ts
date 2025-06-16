import { formatRawGithubJobToGithubJob } from "../../helpers/format/formatGithubJobToLocalJob.js";
import { formatGithubUsageDataToLocalUsageData } from "../../helpers/format/formatGithubUsageDataToLocalUsageData.js";
import { getFormattedWorkflowRun } from "../../helpers/getFormattedWorkflowRun.js";
import logger from "../Logger/logger.js";
import { buildGetAllJobsByIds } from "./controllers/getAllJobsByIds.controller.js";
import { buildGetAllWorkflowsController } from "./controllers/getAllWorkflowRuns.controller.js";
import { buildGetRetrievedWorkflowDataController } from "./controllers/getRetrievedWorkflowData/getRetrievedWorkflowData.controller.js";
import { buildGetWorkflowRunsUsageController } from "./controllers/getWorkflowRunsUsage.controller.js";
import { buildGetRateLimit } from "./requests/getRateLimit.js";
import type { RequestsManager, RequestsManagerParams } from "./types.js";

export const buildRequestsManager = (
	params: RequestsManagerParams,
): RequestsManager => {
	const { octokit } = params;

	const getAllWorkflowsRunsController = buildGetAllWorkflowsController({
		githubClient: octokit.rest,
		formatWorkflow: getFormattedWorkflowRun,
		onPage: ({ page, total, perPage }) => {
			logger.debug(
				!total
					? `Fetched page ${page} but found no workflow`
					: `Fetched page ${page}/${Math.ceil(total / perPage)} (${Math.min(
							Math.max(0, ((page * perPage) / total) * 100),
							100,
						).toFixed(2)}%)`,
			);
		},
		transformWorkflow: async ({ workflow, owner, repo }) => {
			if (workflow.status !== "completed") return workflow;
			logger.debug("Fetching usage data for run", workflow.runId);
			if (!workflow.usageData?.billable) {
				const response = await octokit.rest.actions.getWorkflowRunUsage({
					owner,
					repo,
					run_id: workflow.runId,
				});
				if (!response?.data?.billable) return workflow;

				workflow.usageData = formatGithubUsageDataToLocalUsageData(
					response.data,
					undefined,
				);
			}
			if (!workflow.usageData?.billable?.jobRuns?.length) return workflow;

			let fetchedJobsCount = 0;
			for (const job of workflow.usageData.billable.jobRuns) {
				if (job.data) continue;

				const response = await octokit.rest.actions.getJobForWorkflowRun({
					owner,
					repo,
					job_id: job.job_id,
				});

				fetchedJobsCount += 1;
				if (!response.data) continue;

				job.data = formatRawGithubJobToGithubJob(response.data).data;
			}

			if (fetchedJobsCount === 0) {
				logger.warn("No jobs fetched for workflow", workflow.runId);
			} else {
				logger.debug(
					`Fetched ${fetchedJobsCount.toString().yellow} jobs for workflow`
						.bgBlack.white,
					workflow.runId,
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
			logger.debug("Fetching workflow runs usage", `${index}/${total}`);
		},
	});

	const getAllJobsByIds = buildGetAllJobsByIds({
		githubClient: octokit.rest,
		onBeforeRequest: (index, total) => {
			logger.debug("Fetching job data", `${index}/${total}`);
		},
	});

	const getRetrievedWorkflowDataController =
		buildGetRetrievedWorkflowDataController({
			getWorkflowRunsUsageController,
			getAllWorkflowsController: getAllWorkflowsRunsController,
			getAllJobsByIds,
		});

	const getRepoWorkflowData: RequestsManager["getRepoWorkflowData"] = async (
		params: Parameters<RequestsManager["getRepoWorkflowData"]>[0],
		options: Parameters<RequestsManager["getRepoWorkflowData"]>[1],
	): ReturnType<RequestsManager["getRepoWorkflowData"]> => {
		const { repositoryName, repositoryOwner, workflowName, branchName } =
			params;
		logger.debug("Fetching Repo Data...".bgBlack.yellow);
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
			const message = `Repository ${params.repositoryName} not found`;
			return {
				hasFailed: true,
				error: {
					code: "repo_not_found",
					message,
					data: repoData.data,
					error: new Error(message),
				},
			};
		}
		if (
			!repoWorkflowsResponse.data ||
			!repoWorkflowsResponse.data.workflows ||
			repoWorkflowsResponse.data.total_count === 0
		) {
			const message = `Workflow ${params.workflowName} not found`;
			return {
				hasFailed: true,
				error: {
					code: "workflow_not_found",
					message,
					data: repoWorkflowsResponse.data,
					error: new Error(message),
				},
			};
		}

		const workflowData = repoWorkflowsResponse.data.workflows.find(
			(workflow) => workflow.name === workflowName,
		);
		if (!workflowData) {
			const message = `Workflow ${params.workflowName} not found`;
			return {
				hasFailed: true,
				error: {
					code: "workflow_not_found",
					message,
					data: workflowData,
					error: new Error(message),
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
					error: getRetrievedWorkflowDataResponse.error.error,
					data: getRetrievedWorkflowDataResponse.error.data,
				},
			};
		}

		return {
			hasFailed: false,
			data: getRetrievedWorkflowDataResponse.data,
		};
	};

	const getRateLimit = buildGetRateLimit({
		githubClient: octokit.rest,
	});

	return {
		getRepoWorkflowData,
		getRateLimit,
	};
};
