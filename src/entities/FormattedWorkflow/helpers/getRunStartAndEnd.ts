import dayjs from "dayjs";
import type { FormattedWorkflowRun } from "../types.js";

const findStartDate = (runData: FormattedWorkflowRun): Date => {
  if (runData.startedAt) {
    return new Date(runData.startedAt);
  }

  const oldestJobDate = runData.usageData?.billable.jobRuns?.reduce<Date>(
    (maybeOldestDate, curr): Date => {
      if (!curr.data?.started_at) return maybeOldestDate;

      if (dayjs(curr.data.started_at).isBefore(maybeOldestDate)) {
        return curr.data.started_at;
      }

      return maybeOldestDate;
    },
    new Date()
  );

  if (!oldestJobDate) return runData.runAt;

  return dayjs(oldestJobDate).isAfter(runData.runAt)
    ? runData.runAt
    : oldestJobDate;
};

const findEndDate = (runData: FormattedWorkflowRun): Date => {
  if (runData.completedAt) {
    return runData.completedAt;
  }

  const latestJobDate = runData.usageData?.billable.jobRuns?.reduce<
    Date | undefined
  >((maybeLatestDate, curr): Date | undefined => {
    if (!curr.data?.completed_at) return maybeLatestDate;

    if (!maybeLatestDate) return curr.data?.completed_at;

    if (dayjs(curr.data?.completed_at).isAfter(maybeLatestDate)) {
      return curr.data?.completed_at;
    }

    return maybeLatestDate;
  }, undefined);

  if (!latestJobDate) {
    throw new Error("Unable to determine run end date");
  }

  return latestJobDate;
};

export function getRunStartAndEnd(runData: FormattedWorkflowRun): {
  startDate: Date;
  endDate: Date;
} {
  return {
    endDate: findEndDate(runData),
    startDate: findStartDate(runData),
  };
}
