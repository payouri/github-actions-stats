import type { Queue as BullQueue } from "bullmq";
import type { MethodResult } from "../../types/MethodResult.js";
import { PopJobsRepeatedly } from "./popJobsRepeatedly.js";

export const UniqueJobsMap = {
	[PopJobsRepeatedly.name]: PopJobsRepeatedly,
} as const;

export type UniqueJobsMapType = typeof UniqueJobsMap;

export async function initUniqueJobs(
	queue: BullQueue,
): Promise<MethodResult<void, string>> {
	for (const job of Object.values(UniqueJobsMap)) {
		if (job.type === "scheduled") {
			const { name, repeat, ...jobOpts } = job;
			await queue.upsertJobScheduler(name, repeat, {
				name,
				opts: jobOpts,
				data: job,
			});
			// if (res.token) console.log(await res.moveToWait(res.token));
		}
	}

	return {
		hasFailed: false,
	};
}
