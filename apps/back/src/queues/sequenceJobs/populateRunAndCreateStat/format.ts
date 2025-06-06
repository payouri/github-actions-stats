import type { StoredWorkflowRun } from "@github-actions-stats/workflow-entity";
import type { components } from "@octokit/openapi-types";
import { formatGithubUsageDataToLocalUsageData } from "../../../helpers/format/formatGithubUsageDataToLocalUsageData.js";

export function formatRunData(params: {
	run: StoredWorkflowRun;
	jobs: components["schemas"]["job"][];
	usageData: components["schemas"]["workflow-run-usage"];
}): StoredWorkflowRun {
	const { run, jobs, usageData } = params;
	const formattedUsageData = formatGithubUsageDataToLocalUsageData(
		usageData,
		jobs.reduce<Record<number, components["schemas"]["job"]>>((acc, val) => {
			acc[val.id] = val;
			return acc;
		}, {}),
	);

	return {
		...run,
		usageData: formattedUsageData,
	};
}
