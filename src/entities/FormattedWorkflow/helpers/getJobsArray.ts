import { GithubJobData, RunUsageData } from "../types.js";

type JobData = {
  jobId: number;
  jobName: string | null;
  durationMs: number;
  data: NonNullable<GithubJobData["data"]> | null;
};

export const getJobsArray = (
  usageData: RunUsageData | null
): Array<JobData> => {
  if (!usageData?.billable) return [];

  return Object.values(usageData.billable).flatMap<JobData>(({ job_runs }) =>
    !job_runs?.length
      ? []
      : job_runs.map((job) => ({
          jobId: job.job_id,
          jobName: job.data?.name ?? null,
          durationMs: job.duration_ms,
          data: job.data ?? null,
        }))
  );
};
