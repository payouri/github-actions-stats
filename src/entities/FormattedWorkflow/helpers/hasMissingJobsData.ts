import { RunUsageData } from "../types.js";

export const hasMissingJobsData = (p: RunUsageData[]) => {
  return p.some((usage) =>
    Object.values(usage.billable).some(
      (b) => b?.jobs > 0 && (!b.job_runs || b.job_runs?.some((j) => !j.data))
    )
  );
};
