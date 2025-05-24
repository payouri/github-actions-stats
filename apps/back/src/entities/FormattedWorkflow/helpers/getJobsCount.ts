import type { RunUsageData } from "@github-actions-stats/workflow-entity";

export const getJobsCount = (runUsageData?: RunUsageData): number => {
	if (!runUsageData?.billable?.jobRuns?.length) return 0;
	if (
		runUsageData.billable.jobRuns.length !== runUsageData.billable.jobsCount
	) {
		throw new Error("Jobs count mismatch");
	}

	return runUsageData.billable.jobsCount;
};
