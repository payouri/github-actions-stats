import type { z } from "zod";
import type {
  retrievedWorkflowV0Schema,
  retrievedWorkflowV1Schema,
} from "./schemas.js";
import { workflowRunId } from "entities/FormattedWorkflow/schema.js";
import {
  FormattedWorkflowRun,
  RunUsageData,
} from "entities/FormattedWorkflow/types.js";

export type RetrievedWorkflowV0 = z.infer<typeof retrievedWorkflowV0Schema>;
export type RetrievedWorkflowV1 = z.infer<typeof retrievedWorkflowV1Schema>;

export type WorkflowRunId = z.infer<typeof workflowRunId>;

export type WorkFlowInstance = Pick<
  RetrievedWorkflowV1,
  "workflowWeekRunsMap" | "totalWorkflowRuns" | "lastRunAt" | "workflowName"
> & {
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
