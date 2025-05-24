import type { WorkflowRunId } from "@github-actions-stats/common-entity";
import type {
	FormattedWorkflowRun,
	RetrievedWorkflow,
	RunUsageData,
} from "@github-actions-stats/workflow-entity";

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
		options?: { allowSkip?: boolean },
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
