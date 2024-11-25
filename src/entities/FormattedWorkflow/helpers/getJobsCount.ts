import { RunUsageData } from "../types.js";

export const getJobsCount = (runUsageData?: RunUsageData): number => {
  if (!runUsageData?.billable) return 0;

  return Object.values(runUsageData.billable).reduce<number>((acc, osData) => {
    if (!osData) return acc;
    const { jobs } = osData;
    if (!jobs) return acc;
    return acc + jobs;
  }, 0);
};
