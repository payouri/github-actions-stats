import { FormattedWorkflowRun } from "../types.js";

export const sortWorkflowMapKeys = (
  workflowMap: Record<string, FormattedWorkflowRun[]>
): Record<string, FormattedWorkflowRun[]> =>
  Object.fromEntries(
    Object.entries(workflowMap)
      // desc order
      .sort(([keyA], [keyB]) => {
        const yearWeekA = Number(keyA.split("_").join(""));
        const yearWeekB = Number(keyB.split("_").join(""));

        return yearWeekB - yearWeekA;
      })
  );
