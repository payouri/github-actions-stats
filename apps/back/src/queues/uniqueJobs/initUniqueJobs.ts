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
		schedulers.map(async ({ id }) => {
			if (!id) return;
			await queue.removeJobScheduler(id);
		}),
	);
	logger.info(`[${queue.name}]: Removed ${schedulers.length} schedulers`);
	for (const [key, job] of Object.entries(UniqueJobsMap)) {
		if (job.type === "scheduled") {
			const { name, repeat, ...jobOpts } = job;
			await queue.upsertJobScheduler(queue.name, repeat, {
				name,
				opts: jobOpts,
				data: {},
			});
			// if (res.token) console.log(await res.moveToWait(res.token));
		}
	}

	return {
		hasFailed: false,
	};
}
