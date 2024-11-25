import dayjs from "dayjs";
import type {
  AggregatedPeriodStats,
  AggregatedPeriodStatsByStepMinutes,
  AggregatedPeriodStatsByStepMS,
  WorkflowsStats,
} from "../types.js";
import { getStandardDeviation } from "./getStandardDeviation.js";
import { getDeciles } from "./getDeciles.js";
import { getXPercentile } from "./getXPercentile.js";

const Periods = {
  WEEK: "week",
  MONTH: "month",
  YEAR: "year",
  DAY: "day",
} as const;

type Period = (typeof Periods)[keyof typeof Periods];

const FORMAT_MAP = {
  [Periods.WEEK]: "YYYY-WW",
  [Periods.MONTH]: "YYYY-MM",
  [Periods.YEAR]: "YYYY",
  [Periods.DAY]: "YYYY-MM-DD",
} as const;
const START_OF_PERIOD_MAP = {
  [Periods.WEEK]: "isoWeek",
  [Periods.MONTH]: "month",
  [Periods.YEAR]: "year",
  [Periods.DAY]: "day",
} as const;

export type GetAveragesByPeriodOptions = {
  period: Period;
  fromDate?: string;
  toDate?: string;
};

export type AggregatedStats = {
  period: Period;
  periodRecord: AggregatedPeriodStats;
  periodArray: {
    date: string;
    period: string;
    data: AggregatedPeriodStatsByStepMinutes;
  }[];
};

export const getAveragesByPeriod = (
  data: WorkflowsStats,
  options: GetAveragesByPeriodOptions
): AggregatedStats => {
  const { fromDate, toDate, period } = options;
  const rawData = data.runsArray.reduce<{
    [name in string]: AggregatedPeriodStatsByStepMS;
  }>((acc, step) => {
    const date = dayjs(step.date);
    const stepRunsMap = new Map<string, number[]>();
    if (fromDate && date.isBefore(dayjs(fromDate))) return acc;
    if (toDate && date.isAfter(dayjs(toDate))) return acc;

    const periodGroupKey = date.format(FORMAT_MAP[period]);

    const periodData = !acc[periodGroupKey] ? {} : acc[periodGroupKey];
    for (const stepStats of step.stepsArray) {
      if (stepStats.stats.success === 0) continue;

      const stepData = !periodData[stepStats.name]
        ? {
            count: 0,
            totalDurationMs: 0,
            shortestDurationMs: 0,
            longestDurationMs: 0,
            periodDate: date.startOf(START_OF_PERIOD_MAP[period]).toISOString(),
            durationValuesMs: stepStats.stats.durationValuesMs,
          }
        : structuredClone(periodData[stepStats.name]);

      stepData.count += 1;
      stepData.totalDurationMs += stepStats.stats.totalDurationMs;
      stepData.durationValuesMs = stepData.durationValuesMs.concat(
        stepStats.stats.durationValuesMs
      );
      if (
        stepStats.stats.totalDurationMs < stepData.shortestDurationMs ||
        stepData.shortestDurationMs === 0
      ) {
        stepData.shortestDurationMs = stepStats.stats.totalDurationMs;
      }
      if (
        stepStats.stats.totalDurationMs > stepData.longestDurationMs ||
        stepData.longestDurationMs === 0
      ) {
        stepData.longestDurationMs = stepStats.stats.totalDurationMs;
      }

      periodData[stepStats.name] = stepData;
    }
    acc[periodGroupKey] = periodData;

    return acc;
  }, {});

  const periodRecord = Object.entries(rawData).reduce<AggregatedPeriodStats>(
    (weeksData, [week, weekData]) => {
      const weekDataArray = Object.entries(
        weekData
      ).reduce<AggregatedPeriodStatsByStepMinutes>(
        (acc, [stepName, stepData]) => {
          acc[stepName] = {
            periodDate: stepData.periodDate,
            count: stepData.count,
            totalDurationMs: stepData.totalDurationMs,
            averageDurationMs: stepData.totalDurationMs / stepData.count,
            longestDurationMs: stepData.longestDurationMs,
            shortestDurationMs: stepData.shortestDurationMs,
            averageDurationMinutes: parseFloat(
              dayjs
                .duration(
                  stepData.totalDurationMs / stepData.count,
                  "milliseconds"
                )
                .asMinutes()
                .toPrecision(3)
            ),
            shortestDurationMinutes: parseFloat(
              dayjs
                .duration(stepData.shortestDurationMs, "milliseconds")
                .asMinutes()
                .toPrecision(3)
            ),
            longestDurationMinutes: parseFloat(
              dayjs
                .duration(stepData.longestDurationMs, "milliseconds")
                .asMinutes()
                .toPrecision(3)
            ),
            stdDeviation: getStandardDeviation(stepData.durationValuesMs),
            deciles: getDeciles(stepData.durationValuesMs),
            p95: getXPercentile(stepData.durationValuesMs, 95),
          };

          return acc;
        },
        {}
      );

      weeksData[week] = weekDataArray;

      return weeksData;
    },
    {}
  );

  return {
    period,
    periodRecord,
    get periodArray() {
      return Object.entries(periodRecord).map(
        ([period, weekData]): {
          date: string;
          period: string;
          data: AggregatedPeriodStatsByStepMinutes;
        } => {
          return {
            date: Object.values(weekData)[0].periodDate,
            period,
            data: weekData,
          };
        }
      );
    },
  };
};
