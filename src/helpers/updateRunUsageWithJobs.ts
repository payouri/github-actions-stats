import type { GithubJobData, RunUsageData } from "../entities/index.js";
import type { components } from "@octokit/openapi-types";
import { formatRawGithubJobToGithubJob } from "./format/formatGithubJobToLocalJob.js";

export function updateRunUsageWithJobs(params: {
  runUsageData: RunUsageData;
  jobs: (GithubJobData | components["schemas"]["job"])[];
}): RunUsageData {
  const { runUsageData, jobs } = params;

  if (jobs.length > runUsageData.billable.jobsCount) {
    runUsageData.billable.jobsCount = jobs.length;
  }
  for (const job of jobs) {
    if (!runUsageData.billable.jobRuns) {
      runUsageData.billable.jobRuns = [];
    }
    const githubJobData =
      "id" in job ? formatRawGithubJobToGithubJob(job) : job;

    const existingJob = runUsageData.billable.jobRuns.findIndex(
      (jobRun) => jobRun.job_id === githubJobData.job_id
    );
    if (existingJob < 0) {
      runUsageData.billable.jobRuns.push(githubJobData);
      if (!githubJobData.data) continue;

      for (const label of githubJobData.data.labels) {
        if (!runUsageData.billable.durationPerLabel[label]) {
          runUsageData.billable.durationPerLabel[label] = 0;
        }
        runUsageData.billable.durationPerLabel[label] +=
          githubJobData.duration_ms;
      }

      continue;
    }

    const oldJobData = runUsageData.billable.jobRuns[existingJob];
    const updatedData = {
      ...oldJobData,
      ...githubJobData,
      duration_ms: !oldJobData.duration_ms
        ? githubJobData.duration_ms
        : githubJobData.duration_ms > oldJobData.duration_ms
        ? githubJobData.duration_ms
        : oldJobData.duration_ms,
    };
    runUsageData.billable.jobRuns[existingJob] = updatedData;
    for (const label of new Set([
      ...(oldJobData.data?.labels ?? []),
      ...(githubJobData.data?.labels ?? []),
    ])) {
      if (!runUsageData.billable.durationPerLabel[label]) {
        runUsageData.billable.durationPerLabel[label] = 0;
      }
      if (oldJobData.data?.labels?.includes(label)) {
        runUsageData.billable.durationPerLabel[label] -= oldJobData.duration_ms;
        if (runUsageData.billable.durationPerLabel[label] < 0) {
          runUsageData.billable.durationPerLabel[label] = 0;
        }
      }
      if (githubJobData.data?.labels?.includes(label)) {
        runUsageData.billable.durationPerLabel[label] +=
          githubJobData.duration_ms;
      }
    }
  }
  runUsageData.billable.totalMs =
    runUsageData.billable.jobRuns?.reduce(
      (acc, job) => acc + job.duration_ms,
      0
    ) ?? 0;
  runUsageData.billable.jobsCount = runUsageData.billable.jobRuns?.length ?? 0;
  runUsageData.run_duration_ms = runUsageData.billable.totalMs;

  return runUsageData;
}
