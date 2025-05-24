import type { RunCompletionStatus } from "../../../entities/FormattedWorkflow/types.js";

export type WantedStatus = Extract<
  RunCompletionStatus,
  "success" | "failure" | "cancelled" | "skipped"
>;
