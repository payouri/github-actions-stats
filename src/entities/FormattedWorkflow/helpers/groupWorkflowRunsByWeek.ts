import { FormattedWorkflowRun } from "../types.js";

export const groupWorkflowRunsByWeek = (
  workflowRuns: FormattedWorkflowRun[]
): Record<string, FormattedWorkflowRun[]> => {
  const groupedByWeek: Record<string, FormattedWorkflowRun[]> = {};

  workflowRuns.forEach((workflowRun) => {
    const week = workflowRun.week_year;
    if (!groupedByWeek[week]) groupedByWeek[week] = [];

    groupedByWeek[week].push(workflowRun);
  });

  return groupedByWeek;
};
