import type { Api as GithubApi } from "@octokit/plugin-rest-endpoint-methods";
import type { RunJobData } from "@github-actions-stats/workflow-entity";
import type { MethodResult } from "../../../types/MethodResult.js";
import { runCompletionStatusSchema } from "@github-actions-stats/common-entity";

export type BuildGetJobsByIdsRequestDependencies = {
	githubClient: GithubApi["rest"];
	sleepConfig?: { ms: number; everyIteration: number };
	onBeforeRequest?: (index: number, total: number) => Promise<void> | void;
	onAfterRequest?: (index: number, total: number) => Promise<void> | void;
};

export type GetJobsByIdsRequestParams = {
	owner: string;
	repo: string;
	jobsIds: number[];
	cachedJobsMap?: Record<number, RunJobData>;
};

export type GetJobsByIdsRequestResponse = MethodResult<
	{
		total: number;
		jobsMap: { [k: number]: RunJobData };
	},
	"failed_to_fetch_jobs_data"
>;

export type GetJobsByIdsRequest = (
	params: GetJobsByIdsRequestParams,
) => Promise<GetJobsByIdsRequestResponse>;

export type BuildGetJobsByIdsRequest = (
	dependencies: BuildGetJobsByIdsRequestDependencies,
) => GetJobsByIdsRequest;

export const buildGetJobsByIds = (
	dependencies: BuildGetJobsByIdsRequestDependencies,
): GetJobsByIdsRequest => {
	const {
		githubClient,
		onAfterRequest,
		onBeforeRequest,
		sleepConfig = {
			everyIteration: 100,
			ms: 1000,
		},
	} = dependencies;

	return async function getJobsByIds(
		params: GetJobsByIdsRequestParams,
	): Promise<GetJobsByIdsRequestResponse> {
		const { owner, repo, jobsIds, cachedJobsMap } = params;

		const finalJobsMap: Record<number, RunJobData> = {};
		let totalJobsCount = 0;

		try {
			for (let i = 0, n = jobsIds.length; i < n; i += 1) {
				const jobId = jobsIds[i];
				if (jobId in finalJobsMap) {
					continue;
				}

				await onBeforeRequest?.(i, n);

				const cachedJobData = cachedJobsMap ? cachedJobsMap[jobId] : null;

				if (cachedJobData) {
					finalJobsMap[jobId] = cachedJobData;
					totalJobsCount += 1;
					continue;
				}

				const response = await githubClient.actions.getJobForWorkflowRun({
					owner,
					repo,
					job_id: jobId,
				});

				await onAfterRequest?.(i, n);

				finalJobsMap[jobId] = {
					...response.data,
					created_at: new Date(response.data.created_at),
					started_at: response.data.started_at
						? new Date(response.data.started_at)
						: null,
					completed_at: response.data.completed_at
						? new Date(response.data.completed_at)
						: null,
					steps: response.data.steps
						? response.data.steps.map((step) => {
								const conclusion = step.conclusion
									? runCompletionStatusSchema.parse(step.conclusion)
									: null;
								return {
									...step,
									started_at: step.started_at
										? new Date(step.started_at)
										: null,
									completed_at: step.completed_at
										? new Date(step.completed_at)
										: null,
									conclusion,
									status: step.status,
								};
							})
						: undefined,
				};
				totalJobsCount += 1;

				const isLastJob = i === jobsIds.length - 1;
				const isLastIteration = i === n - 1;
				const hasSleepValue = sleepConfig.ms > 0;
				const isIterarion = i % sleepConfig.everyIteration === 0;
				const shouldSleep =
					!isLastJob && !hasSleepValue && isIterarion && !isLastIteration;

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
					code: "failed_to_fetch_jobs_data",
					message: "Failed to fetch jobs data",
					error:
						err instanceof Error
							? err
							: new Error("Failed to fetch workflow job data", {
									cause: err,
								}),
					data: finalJobsMap,
				},
			};
		}

		return {
			hasFailed: false,
			data: {
				total: totalJobsCount,
				jobsMap: finalJobsMap,
			},
		};
	};
};
