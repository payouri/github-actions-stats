import dayjs from "dayjs";
import { getRunStartAndEnd } from "../../FormattedWorkflow/helpers/getRunStartAndEnd.js";
import type { WorkflowRunsMongoStorage } from "../../FormattedWorkflow/storage/mongo.js";
import type { FormattedWorkflowRun } from "../../FormattedWorkflow/types.js";
import type { WorkflowRunStat } from "../types.js";
import {
  generateWorkflowKey,
  generateWorkflowRunKey,
} from "../../../helpers/generateWorkflowKey.js";

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

  if (!params.usageData?.billable.jobRuns) return state;

  for (const job of params.usageData?.billable.jobRuns) {
    const formattedJob: WorkflowRunStat["jobs"][number] = {
      durationMs: job.duration_ms,
      jobs: [],
      name: job.data?.name || "unknown",
      status: job.data?.status || "requested",
      stepEnd:
        job.data?.completed_at ||
        job.data?.started_at ||
        job.data?.created_at ||
        new Date(),
      stepId: job.data?.id || -1,
      stepStart: job.data?.started_at || job.data?.created_at || new Date(),
    };

    state.jobDurationMap[job.job_id] = job.duration_ms;
    if (!job.data) continue;

    state.stepsDurationMs[job.job_id] = {};
    state.jobs.push(formattedJob);

    if (!job.data.steps?.length) {
      continue;
    }
    for (const jobStep of job.data.steps) {
      const durationMs = dayjs(jobStep.completed_at).diff(
        jobStep.started_at,
        "milliseconds"
      );
      state.stepsDurationMs[job.job_id][jobStep.name] = durationMs;
      formattedJob.jobs.push({
        jobId: jobStep.number,
        durationMs,
        jobEnd: jobStep.completed_at || new Date(),
        jobStart: jobStep.started_at || new Date(),
        name: jobStep.name,
        status: jobStep.status,
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
  }
): WorkflowRunStat {
  const {} = runData;
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
