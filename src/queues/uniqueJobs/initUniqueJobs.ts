import type { Queue as BullQueue } from "bullmq";
import type { MethodResult } from "../../types/MethodResult.js";
import { PopJobsRepeatedly } from "./popJobsRepeatedly.js";

export const UniqueJobsMap = {
  [PopJobsRepeatedly.name]: PopJobsRepeatedly,
} as const;

export type UniqueJobsMapType = typeof UniqueJobsMap;

export async function initUniqueJobs(
  queue: BullQueue
): Promise<MethodResult<void, string>> {
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
