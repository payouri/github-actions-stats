import type { z } from "zod";
import type { workflowRunId } from "../FormattedWorkflow/schemas/shared.js";
import {
  FormattedWorkflowRun,
  RunUsageData,
} from "../FormattedWorkflow/types.js";
import type {
  retrievedWorkflowV0Schema,
  retrievedWorkflowV1Schema,
} from "./schemas.js";

export type RetrievedWorkflowV0 = z.infer<typeof retrievedWorkflowV0Schema>;
export type RetrievedWorkflowV1 = z.infer<typeof retrievedWorkflowV1Schema>;

export type WorkflowRunId = z.infer<typeof workflowRunId>;

export type WorkFlowInstance = Omit<RetrievedWorkflowV1, "workflowParams"> & {
  updateRunData: (params: {
    runId: WorkflowRunId;
    runUsageData: RunUsageData;
  }) => void;
  getRunUsageData: (runId: WorkflowRunId) => RunUsageData | null;
  addRunData: (
    params: {
      runId: WorkflowRunId;
      runData: FormattedWorkflowRun;
    },
    options?: { allowSkip?: boolean }
  ) => void;
  serializableData: RetrievedWorkflowV1;
  isExistingRunData: (runId: WorkflowRunId) => boolean;
  getRunData: (runId: WorkflowRunId) => FormattedWorkflowRun | null;
  [Symbol.iterator]: () => Iterator<
    [WorkflowRunId, FormattedWorkflowRun],
    void,
    undefined
  >;
  runHasMissingData: (runData: FormattedWorkflowRun) => boolean;
  formattedWorkflowRuns: FormattedWorkflowRun[];
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
};
