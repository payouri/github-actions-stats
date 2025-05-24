import type {
	RunJobData,
	RunUsageData,
} from "@github-actions-stats/workflow-entity";

export const getJobsMapFromUsageData = (
	usageData: { runId: number; usageData: RunUsageData }[],
): Record<string, RunJobData> =>
	usageData.reduce<{
		[k: string]: RunJobData;
	}>((acc, usage) => {
		const { runId, usageData } = usage;
		if (!usageData.billable.jobRuns?.length) return acc;

		for (const job of usageData.billable.jobRuns) {
			if (!job.data) continue;

			acc[`${runId}_${job.job_id}`] = job.data;
		}

		return acc;
	}, {});
