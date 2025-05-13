import { getDateIntervals } from "../getDateIntervals.js";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration.js";

dayjs.extend(duration);

describe("getDateIntervals", () => {
  it("should return an array of intervals", () => {
    const intervals = getDateIntervals({
      from: dayjs().startOf("week").toDate(),
      to: dayjs().endOf("week").toDate(),
      intervalMs: dayjs.duration(1, "hour").asMilliseconds(),
    });
    expect(intervals.length).toBe(7 * 24);
  });
  it("should return an array of intervals with the correct dates", () => {
    const intervals = getDateIntervals({
      from: dayjs().startOf("month").toDate(),
      to: dayjs().endOf("month").toDate(),
      intervalMs: dayjs.duration(1, "day").asMilliseconds(),
    });

    expect(intervals.length).toBe(dayjs().daysInMonth());
    expect(intervals[0].from.toISOString()).toBe(
      dayjs().startOf("month").toISOString()
    );
    expect(intervals[0].to.toISOString()).toBe(
      dayjs()
        .startOf("month")
        .add(1, "day")
        .subtract(1, "millisecond")
        .toISOString()
    );
  });
});
