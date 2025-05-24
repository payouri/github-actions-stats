import type { RunUsageData } from "@github-actions-stats/workflow-entity";

export function isRunUsageData(data: unknown): data is RunUsageData {
	if (typeof data !== "object") return false;
	if (!data) return false;

	if (!("billable" in data)) return false;
	if (typeof data.billable !== "object") return false;
	if (!data.billable) return false;

	if (!("durationPerLabel" in data.billable)) return false;
	if (!("totalMs" in data.billable)) return false;
	if (!("jobsCount" in data.billable)) return false;
	if (!("jobRuns" in data.billable)) return false;

	return true;
}
