import type { RunUsageData } from "@github-actions-stats/workflow-entity";

export const hasMissingJobsData = (p: RunUsageData[]) => {
	return p.some(
		(usage) =>
			!usage.billable.jobRuns || usage.billable.jobRuns.some((b) => !b.data),
	);
};
