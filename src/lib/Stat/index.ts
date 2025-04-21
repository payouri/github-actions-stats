// import dayjs from "dayjs";
// import isoWeek from "dayjs/plugin/isoWeek.js";
// import advancedFormat from "dayjs/plugin/advancedFormat.js";
// import { getWorkflowStats } from "./methods/getWorkflowStats.js";
// import type { WorkflowsStats } from "./types.js";
// import {
//   getAveragesByPeriod,
//   type GetAveragesByPeriodOptions,
// } from "./methods/getAveragesByPeriod.js";

// export const WEEK_SYMBOL = Symbol("week");
// export type * from "./types.js";

// dayjs.extend(isoWeek);
// dayjs.extend(advancedFormat);

// export const buildStats = () => {
//   const getAverages = (data: WorkflowsStats): Record<string, number> => {
//     return data.stepsArray.reduce<{ [name in string]: number }>((acc, step) => {
//       acc[step.name] =
//         step.stats.total > 0
//           ? Math.ceil(step.stats.totalDurationMs / step.stats.total)
//           : 0;

//       return acc;
//     }, {});
//   };

//   return {
//     getAverages,
//     getWorkflowStats,
//     getAveragesByWeek: (
//       data: WorkflowsStats,
//       options?: Omit<GetAveragesByPeriodOptions, "period">
//     ) => getAveragesByPeriod(data, { period: "week", ...options }),
//     getAveragesByPeriod,
//   } as const;
// };

// export const WorkflowStats = buildStats();

// export default buildStats();
