import { GithubJobData, RunJobData, RunUsageData } from "../types.js";

export const updateJobsDataFromMap = (params: {
  jobsMap: { [k: number]: RunJobData };
  usageData: RunUsageData;
}): RunUsageData => {
  const { jobsMap, usageData } = params;

  Object.entries(usageData.billable).forEach(([osName, osData]) => {
    if (!osData.jobs || !osData.job_runs) return;
    osData.job_runs.forEach((jobRun) => {
      const job = jobsMap[jobRun.job_id];
      if (!job) return;

      jobRun.data = job;
    });
  });
  return usageData;
};
