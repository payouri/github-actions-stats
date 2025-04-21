import type { z } from "zod";
import type { workflowRunId } from "../../../entities/FormattedWorkflow/schemas/shared.js";
import {
  FormattedWorkflowRun,
  RunUsageData,
} from "../../../entities/FormattedWorkflow/types.js";
import { retrievedWorkflowSchema } from "./schemas.js";

export type RetrievedWorkflow = z.infer<typeof retrievedWorkflowSchema>;
export type WorkflowRunId = z.infer<typeof workflowRunId>;

export type WorkFlowInstance = Omit<RetrievedWorkflow, "workflowParams"> & {
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
  serializableData: RetrievedWorkflow;
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
