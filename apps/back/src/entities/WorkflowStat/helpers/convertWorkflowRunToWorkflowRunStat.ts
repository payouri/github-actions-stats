import type {
	FormattedWorkflowRun,
	WorkflowRunStat,
} from "@github-actions-stats/workflow-entity";
import dayjs from "dayjs";
import {
	generateWorkflowKey,
	generateWorkflowRunKey,
} from "../../../helpers/generateWorkflowKey.js";
import { getRunStartAndEnd } from "../../FormattedWorkflow/helpers/getRunStartAndEnd.js";

type InputRun = FormattedWorkflowRun & {
	workflowName: string;
	repositoryName: string;
	repositoryOwner: string;
};

function getMaps(params: InputRun) {
	const state: Pick<
		WorkflowRunStat,
		"jobs" | "stepsDurationMs" | "jobDurationMap"
	> = {
		jobs: [],
		stepsDurationMs: {},
		jobDurationMap: {},
	};

	if (!params.usageData?.billable.jobRuns?.length) return state;

	for (const job of params.usageData.billable.jobRuns) {
		const formattedJob: WorkflowRunStat["jobs"][number] = {
			durationMs: job.duration_ms,
			steps: [],
			name: job.data?.name || "unknown",
			status: job.data?.status || "unknown",
			conclusion: job.data?.conclusion || "unknown",
			jobEnd:
				job.data?.completed_at ||
				job.data?.started_at ||
				job.data?.created_at ||
				new Date(),
			jobId: job.data?.id || -1,
			jobStart: job.data?.started_at || job.data?.created_at || new Date(),
		};

		state.jobDurationMap[job.job_id] = job.duration_ms;
		if (!job.data) continue;

		state.stepsDurationMs[job.job_id] = {};
		state.jobs.push(formattedJob);

		if (!job.data.steps?.length || job.data.conclusion === "skipped") {
			continue;
		}
		for (const stepData of job.data.steps) {
			const stepDurationMs =
				stepData.conclusion === "skipped"
					? 0
					: dayjs(stepData.completed_at).diff(
							stepData.started_at,
							"milliseconds",
						);
			state.stepsDurationMs[job.job_id][stepData.name] = stepDurationMs;
			formattedJob.steps.push({
				jobId: stepData.number,
				durationMs: stepDurationMs,
				jobEnd: stepData.completed_at || new Date(),
				jobStart: stepData.started_at || new Date(),
				name: stepData.name,
				status: stepData.status,
				conclusion: stepData.conclusion || "unknown",
			});
		}
	}

	return state;
}

export function convertWorkflowRunToWorkflowRunStat(
	runData: FormattedWorkflowRun & {
		workflowName: string;
		repositoryName: string;
		repositoryOwner: string;
	},
): WorkflowRunStat {
	const startAndEnd = getRunStartAndEnd(runData);
	if (!runData.conclusion) {
		throw new Error("missing conclusion data");
	}

	return {
		...getMaps(runData),
		completedAt: startAndEnd.endDate,
		completionState: runData.conclusion,
		durationMs: dayjs(startAndEnd.endDate).diff(startAndEnd.startDate, "ms"),
		workflowId: runData.workflowId,
		workflowName: runData.workflowName,
		runId: runData.runId,
		startedAt: startAndEnd.startDate,
		runKey: generateWorkflowRunKey({
			workflowName: runData.workflowName,
			repositoryName: runData.repositoryName,
			repositoryOwner: runData.repositoryOwner,
			runId: runData.runId,
		}),
		workflowKey: generateWorkflowKey({
			workflowName: runData.workflowName,
			workflowParams: {
				owner: runData.repositoryOwner,
				repo: runData.repositoryName,
			},
		}),
	};
}
