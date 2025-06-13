import { DB } from "../../entities/db.js";
import { DEFAULT_PENDING_JOB_GROUP } from "../../entities/PendingJob/constants.js";
import { AbortError } from "../../errors/AbortError.js";
import type {
	DefaultJob,
	DefaultJobDefinition,
} from "../../lib/Queue/types.js";
import type { MethodResult } from "../../types/MethodResult.js";
import { POPULATE_RUN_AND_CREATE_STAT_JOB_NAME } from "../sequenceJobs/populateRunAndCreateStat/populateRunAndCreateStat.job.js";

export const REFRESH_RUNS_DATA_JOB_NAME = "refresh-runs-data" as const;

export type RefreshRunsDataJobJobName = typeof REFRESH_RUNS_DATA_JOB_NAME;
export type RefreshRunsDataJobError =
	| "failed_to_refresh_runs_data"
	| "abort_signal_aborted"
	| "failed_to_create_pending_job";

export interface RefreshRunsData extends DefaultJobDefinition {
	jobName: RefreshRunsDataJobJobName;
	jobData: {
		runKeys: string[];
	};
	// biome-ignore lint/suspicious/noConfusingVoidType: <explanation>
	jobResult: void;
	jobErrorCode: RefreshRunsDataJobError;
}

export async function refreshRunsData(
	params: DefaultJob<RefreshRunsData>,
	options?: { abortSignal?: AbortSignal },
): Promise<
	MethodResult<RefreshRunsData["jobResult"], RefreshRunsData["jobErrorCode"]>
> {
	const { runKeys } = params.data;
	const { abortSignal } = options ?? {};

	while (runKeys.length) {
		if (abortSignal?.aborted) {
			return {
				hasFailed: true,
				error: {
					code: "abort_signal_aborted",
					message: "Aborted",
					error: new AbortError({
						message: "Batch aggregation aborted",
						signal: abortSignal,
						abortReason:
							typeof abortSignal.reason === "string"
								? abortSignal.reason
								: JSON.stringify(abortSignal.reason),
					}),
					data: undefined,
				},
			};
		}

		const runKey = runKeys.shift();
		if (!runKey) break;

		const job = await DB.mutations.createPendingJob({
			method: POPULATE_RUN_AND_CREATE_STAT_JOB_NAME,
			group: DEFAULT_PENDING_JOB_GROUP,
			data: {
				workflowRunKey: runKey,
			},
		});
		if (job.hasFailed) {
			return {
				hasFailed: true,
				error: {
					code: "failed_to_create_pending_job",
					message: job.error.code,
					error: job.error.error,
					data: job.error.data,
				},
			};
		}
		await params.updateData({
			runKeys,
		});
	}

	return {
		hasFailed: false,
	};
}
