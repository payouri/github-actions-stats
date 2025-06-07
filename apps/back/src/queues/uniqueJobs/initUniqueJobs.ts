import type { Queue as BullQueue } from "bullmq";
import type { MethodResult } from "../../types/MethodResult.js";
import { PopJobsRepeatedly } from "./popJobsRepeatedly.js";
import logger from "../../lib/Logger/logger.js";

export const UniqueJobsMap = {
	[PopJobsRepeatedly.name]: PopJobsRepeatedly,
} as const;

export type UniqueJobsMapType = typeof UniqueJobsMap;

export async function initUniqueJobs(
	queue: BullQueue,
): Promise<MethodResult<void, string>> {
	const schedulers = await queue.getJobSchedulers();
	console.log(
		schedulers.length,
		schedulers.map(({ id, key }) => ({
			id,
			key,
		})),
	);
	await Promise.all(
		schedulers.map(async ({ id, key }) => {
			if (!id && !key) return;
			await queue.removeJobScheduler(id || key);
		}),
	);
	logger.info(`[${queue.name}]: Removed ${schedulers.length} schedulers`);
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
