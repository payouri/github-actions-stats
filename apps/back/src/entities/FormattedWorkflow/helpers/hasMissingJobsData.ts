import type { RunUsageData } from "@github-actions-stats/workflow-entity";

export const hasMissingJobsData = (p: RunUsageData[]) => {
	return p.some(
		(usage) =>
			typeof usage.run_duration_ms !== "number" ||
			!usage.billable.jobRuns ||
			usage.billable.jobRuns.some((b) => !b.data) ||
			usage.billable.jobRuns.length !== usage.billable.jobsCount ||
			usage.billable.jobRuns.some(
				(b) =>
					!b.data ||
					(b.data.conclusion !== "skipped" &&
						b.duration_ms &&
						!b.data.steps?.length),
			),
	);
};
