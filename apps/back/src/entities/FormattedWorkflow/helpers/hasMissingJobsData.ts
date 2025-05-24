import { RunUsageData } from "../types.js";

export const hasMissingJobsData = (p: RunUsageData[]) => {
  return p.some(
    (usage) =>
      !usage.billable.jobRuns || usage.billable.jobRuns.some((b) => !b.data)
  );
};
