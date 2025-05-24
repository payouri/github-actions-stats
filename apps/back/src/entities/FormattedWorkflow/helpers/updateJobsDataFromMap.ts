import type {
	RunJobData,
	RunUsageData,
	GithubJobData,
} from "@github-actions-stats/workflow-entity";

export const updateJobsDataFromMap = (params: {
	jobsMap: { [k: number]: RunJobData };
	usageData: RunUsageData;
}): RunUsageData => {
	const { jobsMap, usageData } = params;

	if (!usageData.billable.jobRuns) return usageData;

	usageData.billable.jobRuns = usageData.billable.jobRuns.map(
		(jobRun): GithubJobData => {
			const job = jobsMap[jobRun.job_id];
			if (!job) return jobRun;

			jobRun.data = job;

			return jobRun;
		},
	);

	return usageData;
};
