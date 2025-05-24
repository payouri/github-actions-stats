import dayjs from "dayjs";
import durationPlugin from "dayjs/plugin/duration.js";

dayjs.extend(durationPlugin);

const PERIOD_TO_INTERVAL_MS_MAP = {
  day: dayjs.duration(1, "hour").asMilliseconds(),
  week: dayjs.duration(4, "hours").asMilliseconds(),
  month: dayjs.duration(1, "day").asMilliseconds(),
} as const;

const PERIOD_FROM_END_TRANSFORM_MAP = {
  day: {
    from: (from: Date) => dayjs(from).startOf("day"),
    to: (from: Date) => dayjs(from).endOf("day"),
  },
  week: {
    from: (from: Date) => dayjs(from).startOf("week"),
    to: (from: Date) => dayjs(from).endOf("week"),
  },
  month: {
    from: (from: Date) => dayjs(from).startOf("month"),
    to: (from: Date) => dayjs(from).endOf("month"),
  },
} as const;

export const getPeriodBoundaries = (
  period: "day" | "week" | "month",
  from: Date
): {
  from: Date;
  to: Date;
  intervalMs: number;
} => {
  const { from: fromFn, to: toFn } = PERIOD_FROM_END_TRANSFORM_MAP[period];
  const intervalMs = PERIOD_TO_INTERVAL_MS_MAP[period];

  return {
    from: fromFn(from).toDate(),
    to: toFn(from).toDate(),
    intervalMs,
  };
};
