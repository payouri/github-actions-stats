import type {
	FormattedWorkflowRun,
	RunJobData,
	RunUsageData,
} from "@github-actions-stats/workflow-entity";
import type { components } from "@octokit/openapi-types";
import { formatGithubUsageDataToLocalUsageData } from "../../../helpers/format/formatGithubUsageDataToLocalUsageData.js";
import { isRunUsageData } from "./runUsageData.helper.js";

export const matchWorkflowRunsAndUsageData = (
	workflowRuns: FormattedWorkflowRun[],
	usageData: Record<
		string,
		components["schemas"]["workflow-run-usage"] | RunUsageData
	>,
	jobsMap?: Record<number, components["schemas"]["job"] | RunJobData>,
): FormattedWorkflowRun[] =>
	workflowRuns.map((workflowRun) => {
		const usage = usageData[workflowRun.runId];
		if (!usage) return workflowRun;

		const formattedData = isRunUsageData(usage)
			? usage
			: formatGithubUsageDataToLocalUsageData(usage, jobsMap);

		return {
			...workflowRun,
			usageData: formattedData,
		};
	});
