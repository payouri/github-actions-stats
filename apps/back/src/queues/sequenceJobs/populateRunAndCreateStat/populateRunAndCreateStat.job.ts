import { DB } from "../../../entities/db.js";
import { hasMissingJobsData } from "../../../entities/FormattedWorkflow/helpers/hasMissingJobsData.js";
import { MoveToWaitError } from "../../../errors/MoveToWaitError.js";
import githubClient from "../../../lib/githubClient.js";
import type {
	DefaultJob,
	DefaultJobDefinition,
} from "../../../lib/Queue/types.js";
import type { MethodResult } from "../../../types/MethodResult.js";
import { formatRunData } from "./format.js";
import { getAllJobs } from "./getAllJobs.request.js";

const JobStepMap = {
	fetchRunUsageData: async (
		params: {
			workflowRunKey: string;
		},
		options?: { abortSignal?: AbortSignal },
	): Promise<
		MethodResult<
			void,
			| "workflow_run_not_found"
			| "failed_to_retrieve_run_usage_data"
			| "failed_to_update_run_data"
		>
	> => {
		const { abortSignal } = options ?? {};
		const { workflowRunKey } = params;
		const getRunDataResponse = await DB.queries.getRunData({
			runKey: workflowRunKey,
		});
		if (!getRunDataResponse) {
			return {
				hasFailed: true,
				error: {
					code: "workflow_run_not_found",
					message: `Run with key: ${workflowRunKey} not found`,
					error: new Error(`Run with key: ${workflowRunKey} not found`),
				},
			};
		}
		const { runId, repositoryOwner, repositoryName, workflowKey } =
			getRunDataResponse;
		if (
			getRunDataResponse.usageData &&
			!hasMissingJobsData([getRunDataResponse.usageData])
		) {
			return {
				hasFailed: false,
			};
		}

		const [allGithubJobs, runUsageDataResponse] = await Promise.all([
			getAllJobs(
				{
					repositoryName,
					repositoryOwner,
					runId,
				},
				{ abortSignal },
			),
			githubClient.rest.actions.getWorkflowRunUsage({
				owner: repositoryOwner,
				repo: repositoryName,
				run_id: runId,
			}),
		]);

		console.log(
			"allGithubJobs.length",
			allGithubJobs.length,
			"runUsageDataResponse.data.run_duration_ms",
			runUsageDataResponse.data.run_duration_ms,
		);

		const addWorkflowRunResult = await DB.mutations.addWorkflowRun({
			workflowKey,
			workflowRun: formatRunData({
				run: getRunDataResponse,
				jobs: allGithubJobs,
				usageData: runUsageDataResponse.data,
			}),
		});

		if (addWorkflowRunResult.hasFailed) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_update_run_data",
					message: addWorkflowRunResult.error.code,
					error: addWorkflowRunResult.error.error,
					data: addWorkflowRunResult.error.data,
				},
			};
		}

		return {
			hasFailed: false,
		};
	},
	computeStats: async (
		params: {
			workflowRunKey: string;
		},
		// options?: { abortSignal?: AbortSignal },
	): Promise<
		MethodResult<void, "workflow_run_not_found" | "failed_to_create_stat">
	> => {
		const { workflowRunKey } = params;

		const getRunDataResponse = await DB.queries.getRunData({
			runKey: workflowRunKey,
		});
		if (!getRunDataResponse) {
			return {
				hasFailed: true,
				error: {
					code: "workflow_run_not_found",
					message: `Run with key: ${workflowRunKey} not found`,
					error: new Error(`Run with key: ${workflowRunKey} not found`),
				},
			};
		}

		const upsertResult =
			await DB.mutations.upsertWorkflowRunStat(getRunDataResponse);
		if (upsertResult.hasFailed) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_create_stat",
					message: upsertResult.error.code,
					error: upsertResult.error.error,
					data: upsertResult.error.data,
				},
			};
		}

		return {
			hasFailed: false,
		};
	},
} as const;

type PopulateRunAndCreateStatJobStepName = keyof typeof JobStepMap;
const stepsToIndexMap = Object.keys(JobStepMap).reduce<
	Record<PopulateRunAndCreateStatJobStepName, number>
>(
	(acc, val, index) => {
		acc[val as PopulateRunAndCreateStatJobStepName] = index;
		return acc;
	},
	{} as Record<PopulateRunAndCreateStatJobStepName, number>,
);
const indexToStepMap = Object.fromEntries(
	Object.keys(JobStepMap).entries(),
) as Record<number, PopulateRunAndCreateStatJobStepName>;

export const POPULATE_RUN_AND_CREATE_STAT_JOB_NAME =
	"populate-run-and-create-stat" as const;

export type PopulateRunAndCreateStatJobError =
	| "failed_to_retrieve_run_usage_data"
	| "failed_to_update_run_data"
	| "failed_to_create_stat"
	| "workflow_run_not_found";
export type PopulateRunAndCreateStatJobName =
	typeof POPULATE_RUN_AND_CREATE_STAT_JOB_NAME;

export interface PopulateRunAndCreateStat extends DefaultJobDefinition {
	jobName: PopulateRunAndCreateStatJobName;
	jobData: {
		workflowRunKey: string;
		currentStep?: PopulateRunAndCreateStatJobStepName;
	};
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	jobResult: void;
}

export async function populateRunAndCreateStat(
	job: DefaultJob<PopulateRunAndCreateStat>,
	options?: { abortSignal?: AbortSignal },
): Promise<
	MethodResult<
		PopulateRunAndCreateStat["jobResult"],
		| "failed_to_retrieve_run_usage_data"
		| "failed_to_update_run_data"
		| "failed_to_create_stat"
		| "workflow_run_not_found"
		| "failed_to_move_to_next_step"
	>
> {
	const {
		data: { workflowRunKey, currentStep },
	} = job;
	const step = currentStep ?? indexToStepMap[0];
	const method = JobStepMap[step];

	if (!currentStep) {
		await job.updateData({
			workflowRunKey,
			currentStep: step,
		});
	}

	const methodResult = await method(
		{
			workflowRunKey,
		},
		options,
	);

	if (methodResult.hasFailed) {
		return methodResult;
	}

	const nextStep = indexToStepMap[stepsToIndexMap[step] + 1];
	if (nextStep) {
		await job.updateData({
			workflowRunKey,
			currentStep: nextStep,
		});
		if (!job.token) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_move_to_next_step",
					message: "Failed to move to next step",
					error: new Error("Failed to move to next step"),
					data: undefined,
				},
			};
		}

		throw new MoveToWaitError({
			message: "Job is not finished, waiting for next step",
			jobToken: job.token,
		});
	}

	job.opts.removeOnComplete = true;
	return {
		hasFailed: false,
	};
}
