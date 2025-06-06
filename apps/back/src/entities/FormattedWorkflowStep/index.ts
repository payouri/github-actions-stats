import type { RunJobData } from "@github-actions-stats/workflow-entity";

export type FormattedWorkflowStep = {
	name: string;
	status: string;
	runId: number;
	runNumber: number;
	runAttempt: number;
	startedAt: string | null;
	completedAt: string | null;
};

export type FormattedJob = {
	name: string;
	startedAt: string | null;
	completedAt: string | null;
	status: string;
	steps: FormattedWorkflowStep[];
};

export const getFormattedWorkflowSteps = (
	runData: RunJobData,
): FormattedWorkflowStep[] => {
	const { steps, run_id, run_attempt } = runData;
	if (!steps) return [];

	return steps.map((step): FormattedWorkflowStep => {
		const { name, status, started_at, completed_at, number } = step;
		return {
			name,
			status,
			runId: run_id,
			runNumber: number,
			runAttempt: run_attempt ?? 0,
			startedAt: started_at?.toISOString() || null,
			completedAt: completed_at?.toISOString() || null,
		};
	});
};

export const getFormattedJob = (jobData: RunJobData): FormattedJob => {
	const steps = getFormattedWorkflowSteps(jobData);

	return {
		completedAt: jobData.completed_at?.toISOString() || null,
		name: jobData.name,
		startedAt: jobData.started_at?.toISOString() || null,
		status: jobData.status,
		steps,
	};
};
