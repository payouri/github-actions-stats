import type { RunCompletionStatus } from "@github-actions-stats/common-entity";

export type WantedStatus = Extract<
	RunCompletionStatus,
	"success" | "failure" | "cancelled" | "skipped"
>;
