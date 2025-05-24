import type { FormattedWorkflowRun } from "@github-actions-stats/workflow-entity";

export const groupWorkflowRunsByWeek = (
	workflowRuns: FormattedWorkflowRun[],
): Record<string, FormattedWorkflowRun[]> => {
	const groupedByWeek: Record<string, FormattedWorkflowRun[]> = {};

	for (const workflowRun of workflowRuns) {
		const week = workflowRun.week_year;
		if (!groupedByWeek[week]) groupedByWeek[week] = [];

		groupedByWeek[week].push(workflowRun);
	}

	return groupedByWeek;
};
