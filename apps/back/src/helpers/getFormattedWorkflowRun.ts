import {
	type FormattedWorkflowRun,
	formattedWorkflowRunStatusSchema,
	formattedWorkflowRunConclusionSchema,
} from "@github-actions-stats/workflow-entity";
import type { components } from "@octokit/openapi-types";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration.js";
import weekOfYear from "dayjs/plugin/weekOfYear.js";

type WorkflowRunEvent =
	| components["schemas"]["webhook-workflow-run-in-progress"]
	| components["schemas"]["webhook-workflow-run-completed"]
	| components["schemas"]["webhook-workflow-run-requested"];

dayjs.extend(weekOfYear);
dayjs.extend(durationPlugin);

export const getFormattedWorkflowRunWeekYear = (runStartedAt: string) =>
	`${dayjs(runStartedAt).format("YYYY")}_${dayjs(runStartedAt).week()}`;

export const getFormattedWorkflowRun = ({
	name,
	status,
	run_started_at,
	workflow_id,
	updated_at,
	id,
	conclusion,
}:
	| components["schemas"]["workflow-run"]
	| WorkflowRunEvent["workflow_run"]): FormattedWorkflowRun => ({
	name: name ?? "unknown",
	status: formattedWorkflowRunStatusSchema.parse(status ?? "unknown"),
	conclusion: formattedWorkflowRunConclusionSchema.parse(conclusion),
	runAt: dayjs(run_started_at).toDate(),
	week_year: getFormattedWorkflowRunWeekYear(
		run_started_at || dayjs().toISOString(),
	),
	runId: id,
	workflowId: workflow_id,
	usageData: null,
	startedAt: dayjs(run_started_at).toDate(),
	completedAt: dayjs(updated_at).toDate(),
});
