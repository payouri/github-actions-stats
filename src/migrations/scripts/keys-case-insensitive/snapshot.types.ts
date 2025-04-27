import type { z } from "zod";
import type {
  formattedWorkflowRunSchema,
  githubJobDataSchema,
  retrievedWorkflowSchema,
  runCompletionStatusSchema,
  runJobDataSchema,
  runUsageDataSchema,
  workflowRunId,
} from "./snapshot.schemas.js";

export type RunCompletionStatus = z.infer<typeof runCompletionStatusSchema>;
export type RunJobData = z.infer<typeof runJobDataSchema>;
export type GithubJobData = z.infer<typeof githubJobDataSchema>;
export type RunUsageData = z.infer<typeof runUsageDataSchema>;
export type FormattedWorkflowRun = z.infer<typeof formattedWorkflowRunSchema>;

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
