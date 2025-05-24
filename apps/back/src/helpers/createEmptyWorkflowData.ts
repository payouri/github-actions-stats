import type { RetrievedWorkflow } from "../cli/entities/RetrievedWorkflowData/types.js";

export function createEmptyWorkflowData(params: {
  workflowId: number;
  workflowName: string;
  workflowRepository: string;
  workflowOwner: string;
}): RetrievedWorkflow {
  return {
    lastRunAt: new Date(),
    lastUpdatedAt: new Date(),
    oldestRunAt: new Date(),
    totalWorkflowRuns: 0,
    workflowId: params.workflowId,
    workflowName: params.workflowName,
    workflowParams: {
      owner: params.workflowOwner,
      repo: params.workflowRepository,
    },
    workflowWeekRunsMap: {},
  };
}
