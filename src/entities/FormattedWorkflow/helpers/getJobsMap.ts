import { RunJobData, RunUsageData } from "../types.js";

export const getJobsMapFromUsageData = (
  usageData: { runId: number; usageData: RunUsageData }[]
): Record<string, RunJobData> =>
  usageData.reduce<{
    [k: string]: RunJobData;
  }>((acc, usage) => {
    const { runId, usageData } = usage;
    if (!usageData.billable) return acc;

    Object.values(usageData.billable).forEach((usage) => {
      if (!usage?.job_runs) return;

      usage.job_runs.forEach((job) => {
        if (!job.data) return;

        acc[`${runId}_${job.job_id}`] = job.data;
      });
    });

    return acc;
  }, {});
