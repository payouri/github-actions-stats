import type {
	GithubJobData,
	RunUsageData,
} from "@github-actions-stats/workflow-entity";

type JobData = {
	jobId: number;
	jobName: string | null;
	durationMs: number;
	data: NonNullable<GithubJobData["data"]> | null;
};

export const getJobsArray = (
	usageData: RunUsageData | null,
): Array<JobData> => {
	if (!usageData?.billable?.jobRuns?.length) return [];

	return usageData.billable.jobRuns.map((job) => ({
		jobId: job.job_id,
		jobName: job.data?.name ?? null,
		durationMs: job.duration_ms,
		data: job.data ?? null,
	}));
};
