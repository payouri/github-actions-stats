import type { components } from "@octokit/openapi-types";
import type { FormattedWorkflowRun } from "../types.js";

export const matchWorkflowRunsAndUsageData = (
  workflowRuns: FormattedWorkflowRun[],
  usageData: Record<string, components["schemas"]["workflow-run-usage"]>
): FormattedWorkflowRun[] =>
  workflowRuns.map((workflowRun) => {
    const usage = usageData[workflowRun.runId];
    if (!usage) return workflowRun;

    return {
      ...workflowRun,
      usageData: usage,
    };
  });
