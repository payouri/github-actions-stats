import type { components } from "@octokit/openapi-types";
import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration.js";
import weekOfYear from "dayjs/plugin/weekOfYear.js";
import {
  formattedWorkflowRunConclusionSchema,
  formattedWorkflowRunStatusSchema,
} from "../entities/FormattedWorkflow/schemas/schema.js";
import { FormattedWorkflowRun } from "../entities/FormattedWorkflow/types.js";

dayjs.extend(weekOfYear);
dayjs.extend(durationPlugin);

export const getFormattedWorkflowRunWeekYear = (runStartedAt: string) =>
  `${dayjs(runStartedAt).format("YYYY")}_${dayjs(runStartedAt).week()}`;

export const getFormattedWorkflowRun = ({
  name,
  status,
  run_started_at,
  workflow_id,
  id,
  conclusion,
}: components["schemas"]["workflow-run"]): FormattedWorkflowRun => ({
  name: name ?? "unknown",
  status: formattedWorkflowRunStatusSchema.parse(status ?? "unknown"),
  conclusion: formattedWorkflowRunConclusionSchema.parse(conclusion),
  runAt: dayjs(run_started_at).toDate(),
  week_year: getFormattedWorkflowRunWeekYear(
    run_started_at || dayjs().toISOString()
  ),
  runId: id,
  workflowId: workflow_id,
  usageData: null,
});
