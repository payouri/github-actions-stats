import type { components } from "@octokit/openapi-types";
import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import type { MethodResult } from "../../../types/MethodResult.js";

export type BuildGetWorkflowRunJobsRequestDependencies = {
	githubClient: GithubApi["rest"];
	onBeforeRequest?: (index: number, total: number) => Promise<void> | void;
	onAfterRequest?: (index: number, total: number) => Promise<void> | void;
};

export type GetWorkflowRunJobsRequestParams = {
	workflowRunId: number;
	owner: string;
	repo: string;
};

export type GetWorkflowRunJobsRequestResponse = MethodResult<
	{
		total_count: number;
		jobs: components["schemas"]["job"][];
		jobsMap: Record<number, components["schemas"]["job"]>;
	},
	"failed_to_fetch_jobs_data"
>;

export type GetWorkflowRunJobsRequest = (
	params: GetWorkflowRunJobsRequestParams,
) => Promise<GetWorkflowRunJobsRequestResponse>;

export type BuildGetWorkflowRunJobsRequest = (
	dependencies: BuildGetWorkflowRunJobsRequestDependencies,
) => GetWorkflowRunJobsRequest;

export const buildGetWorkflowRunJobs = (
	dependencies: BuildGetWorkflowRunJobsRequestDependencies,
): GetWorkflowRunJobsRequest => {
	const { githubClient, onAfterRequest, onBeforeRequest } = dependencies;

	return async function getWorkflowRunJobs(
		params: GetWorkflowRunJobsRequestParams,
	): Promise<GetWorkflowRunJobsRequestResponse> {
		const { workflowRunId, owner, repo } = params;

		try {
			onBeforeRequest?.(0, 1);
			const response = await githubClient.actions.listJobsForWorkflowRun({
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
				data: {
					...response.data,
					jobsMap: response.data.jobs.reduce<
						Record<number, components["schemas"]["job"]>
					>((acc, job) => {
						acc[job.id] = job;
						return acc;
					}, {}),
				},
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
