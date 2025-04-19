import type { components } from "@octokit/openapi-types";
import {
  formattedWorkflowRunConclusionSchema,
  runStatus,
  type GithubJobData,
  type RunJobData,
} from "../../entities/index.js";
import dayjs from "dayjs";

export function formatRunStepToGirlJobStep(
  step: NonNullable<components["schemas"]["job"]["steps"]>[number]
): NonNullable<RunJobData["steps"]>[number] {
  return {
    ...step,
    started_at: step.started_at ? new Date(step.started_at) : null,
    completed_at: step.completed_at ? new Date(step.completed_at) : null,
    conclusion: step.conclusion,
    status: step.status,
  };
}

export function formatRawGithubJobToGithubJob(
  job: components["schemas"]["job"]
): GithubJobData {
  const durationMs =
    job.completed_at && job.started_at
      ? dayjs(job.completed_at).diff(dayjs(job.started_at), "millisecond")
      : 0;
  const conclusion = formattedWorkflowRunConclusionSchema.safeParse(
    job.conclusion
  );
  const status = runStatus.parse(job.status);

  return {
    job_id: job.id,
    duration_ms: durationMs,
    data: {
      ...job,
      conclusion: conclusion.success ? conclusion.data : null,
      status,
      created_at: new Date(job.created_at),
      started_at: job.started_at ? new Date(job.started_at) : null,
      completed_at: job.completed_at ? new Date(job.completed_at) : null,
      steps: job.steps ? job.steps.map(formatRunStepToGirlJobStep) : undefined,
    },
  };
}
