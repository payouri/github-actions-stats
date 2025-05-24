import dayjs from "dayjs";
import {
  FormattedWorkflowRun,
  RunUsageData,
} from "../../../../entities/FormattedWorkflow/types.js";
import logger from "../../../../lib/Logger/logger.js";
import { createDurationMap } from "../internals/durationMap.js";
import { createWorkflowsMaps } from "../internals/workflowMaps.js";
import { RetrievedWorkflow, WorkFlowInstance } from "../types.js";
import {
  saveRetrievedWorkflowData,
  saveRetrivedWorkflowRuns,
} from "./saveRetrievedWorkDataFromDisk.js";

const initInternals = (rawData: RetrievedWorkflow) => {
  const w = createWorkflowsMaps(rawData.workflowWeekRunsMap);
  const computedDurationMap = createDurationMap(rawData.workflowWeekRunsMap);

  return { ...w, computedDurationMap };
};

const sortWorkflowRuns = (a: FormattedWorkflowRun, b: FormattedWorkflowRun) => {
  return dayjs(a.runAt).isBefore(b.runAt) ? 1 : -1;
};

const getWorkflowsArray = (params: {
  workflowId: number;
  weekRunsMap: Map<string, { weekYear: string; run: FormattedWorkflowRun }>;
  weekRunsIdsMap: Map<string, number[]>;
}) => {
  const { workflowId, weekRunsMap, weekRunsIdsMap } = params;
  const weekRunsArray = Array.from(weekRunsIdsMap).reduce<
    FormattedWorkflowRun[]
  >((acc, [, runIds]) => {
    runIds.forEach((runId) => {
      const run = weekRunsMap.get(`${workflowId}_${runId}`)?.run;
      if (!run) return;

      acc.push(run);
    });
    return acc;
  }, []);

  return weekRunsArray.sort(sortWorkflowRuns);
};

const buildCommitChanges = (dependencies: {
  path: string;
}): ((params: { workflowInstance: WorkFlowInstance }) => Promise<void>) => {
  let commitPromise: Promise<void> | null = null;

  const { path } = dependencies;

  return async ({ workflowInstance }) => {
    if (commitPromise) await commitPromise;

    commitPromise = new Promise<void>(async (resolve) => {
      await Promise.all([
        saveRetrievedWorkflowData(workflowInstance.serializableData),
        saveRetrivedWorkflowRuns({
          repositoryName: workflowInstance.repositoryName,
          repositoryOwner: workflowInstance.repositoryOwner,
          workflowName: workflowInstance.workflowName,
          branchName: workflowInstance.branchName,
          runs: Object.values(
            workflowInstance.serializableData.workflowWeekRunsMap
          ).reduce<Record<number, FormattedWorkflowRun>>((acc, runs) => {
            runs.forEach((run) => {
              acc[run.runId] = run;
            });

            return acc;
          }, {}),
        }),
      ]);
      resolve();
    });

    await commitPromise;
    commitPromise = null;
  };
};

const getWeekRunsMapKey = (workflowId: number, runId: number) =>
  `${workflowId}_${runId}`;

export const createWorkflowInstance = (
  rawData: RetrievedWorkflow,
  options?: {
    autoCommit?:
      | {
          every: number;
          path: string;
        }
      | false;
  }
): WorkFlowInstance => {
  const { autoCommit = false } = options ?? {};
  const weekRunsMap = new Map<
    string,
    { weekYear: string; run: FormattedWorkflowRun }
  >();
  const weekRunsIdsMap = new Map<string, number[]>();
  let unCommittedRunsCount = 0;
  let currentLastRun: FormattedWorkflowRun | undefined;
  let oldestRun: FormattedWorkflowRun | undefined;
  let lastUpdatedAt = rawData.lastUpdatedAt;
  let total = 0;
  let _cachedArray: FormattedWorkflowRun[] | null = null;
  const { getRunUsageData, replaceOrAddRunUsageData } = initInternals(rawData);
  const commitChanges = autoCommit
    ? buildCommitChanges({ path: autoCommit.path })
    : null;

  const onRunAdded = (run: FormattedWorkflowRun, isInitFlow = false) => {
    if (!currentLastRun || dayjs(currentLastRun.runAt).isBefore(run.runAt)) {
      currentLastRun = run;
    }
    if (!oldestRun || dayjs(oldestRun.runAt).isAfter(run.runAt)) {
      oldestRun = run;
    }
    if (_cachedArray) {
      _cachedArray = null;
    }
    total += 1;
    unCommittedRunsCount += 1;
    if (
      !isInitFlow &&
      commitChanges &&
      autoCommit &&
      unCommittedRunsCount % autoCommit.every === 0
    ) {
      let current = Number(unCommittedRunsCount);
      commitChanges({ workflowInstance: instance }).then(() => {
        unCommittedRunsCount = Math.max(0, current - unCommittedRunsCount);
      });
    }
  };
  const getWorkflowWeekRunsMap = () =>
    Array.from(weekRunsIdsMap).reduce<RetrievedWorkflow["workflowWeekRunsMap"]>(
      (acc, [weekYear, runIds]) => {
        acc[weekYear] = runIds.reduce<FormattedWorkflowRun[]>((acc, runId) => {
          const run = weekRunsMap.get(
            getWeekRunsMapKey(rawData.workflowId, runId)
          )?.run;
          if (!run) return acc;

          acc.push(run);
          return acc;
        }, []);
        return acc;
      },
      {}
    );

  for (const [weekYear, runs] of Object.entries(rawData.workflowWeekRunsMap)) {
    for (const run of runs) {
      weekRunsIdsMap.set(
        weekYear,
        (weekRunsIdsMap.get(weekYear) ?? []).concat([run.runId])
      );
      weekRunsMap.set(`${rawData.workflowId}_${run.runId}`, {
        run: {
          ...run,
          get usageData() {
            return getRunUsageData(run.runId);
          },
        },
        weekYear,
      });
      onRunAdded(run, true);
    }
  }

  const updateRunData = (params: {
    runId: number;
    runUsageData: RunUsageData;
  }) => {
    const runData = weekRunsMap.get(
      `${rawData.workflowId}_${params.runId}`
    )?.run;
    if (!runData) throw new Error("No run data");

    replaceOrAddRunUsageData(params.runId, {
      ...runData,
      usageData: params.runUsageData,
    });
  };

  const addRunData = (
    params: {
      runId: number;
      runData: FormattedWorkflowRun;
    },
    options?: { allowSkip?: boolean }
  ) => {
    const { runId, runData } = params;
    const { allowSkip = false } = options ?? {};
    if (
      weekRunsMap.has(getWeekRunsMapKey(rawData.workflowId, runId)) &&
      !allowSkip
    ) {
      logger.warn("Already existing run data", {
        stored: weekRunsMap.get(getWeekRunsMapKey(rawData.workflowId, runId)),
        new: runData,
      });

      throw new Error("Already existing run data");
    }

    replaceOrAddRunUsageData(runId, runData, options);
    const data = {
      run: {
        ...runData,
        get usageData() {
          return getRunUsageData(runData.runId);
        },
      },
      weekYear: runData.week_year,
    };
    weekRunsIdsMap.set(
      data.weekYear,
      (weekRunsIdsMap.get(data.weekYear) ?? []).concat([runId])
    );
    weekRunsMap.set(getWeekRunsMapKey(rawData.workflowId, runId), data);
    onRunAdded(runData);
  };

  const instance = {
    [Symbol.iterator]() {
      const workflowArray =
        _cachedArray ??
        getWorkflowsArray({
          workflowId: rawData.workflowId,
          weekRunsMap: weekRunsMap,
          weekRunsIdsMap: weekRunsIdsMap,
        });
      _cachedArray = workflowArray;
      let index = 0;
      return {
        next() {
          if (index >= workflowArray.length)
            return { done: true, value: undefined };
          const run = workflowArray[index];
          index++;
          return { done: false, value: [run.runId, run] };
        },
      };
    },
    getRunUsageData,
    updateRunData,
    addRunData,
    runHasMissingData(runData: FormattedWorkflowRun) {
      if (!runData.conclusion) return true;
      if (!runData.status || runData.status === "unknown") return true;
      if (!runData.usageData) return true;
      if (!runData.usageData.billable) return true;
      if (!runData.usageData.billable.jobRuns) return true;
      if (runData.usageData.billable.jobRuns.some((job) => !job.data)) {
        return true;
      }

      return false;
    },
    get serializableData() {
      return {
        workflowId: rawData.workflowId,
        workflowName: rawData.workflowName,
        workflowParams: rawData.workflowParams,
        workflowWeekRunsMap: getWorkflowWeekRunsMap(),
        totalWorkflowRuns: total,
        lastRunAt: currentLastRun?.runAt ?? rawData.lastRunAt,
        lastUpdatedAt:
          currentLastRun?.runAt ?? lastUpdatedAt ?? rawData.lastUpdatedAt,
        oldestRunAt: oldestRun?.runAt ?? rawData.oldestRunAt,
      } satisfies RetrievedWorkflow;
    },
    isExistingRunData(runId: number) {
      return weekRunsMap.has(getWeekRunsMapKey(rawData.workflowId, runId));
    },
    getRunData(runId: number) {
      return (
        weekRunsMap.get(getWeekRunsMapKey(rawData.workflowId, runId))?.run ??
        null
      );
    },
    get lastUpdatedAt() {
      return rawData.lastUpdatedAt;
    },
    get lastRunAt() {
      return currentLastRun?.runAt ?? rawData.lastRunAt;
    },
    get oldestRunAt() {
      return oldestRun?.runAt ?? rawData.oldestRunAt;
    },
    get totalWorkflowRuns() {
      return total;
    },
    get workflowId() {
      return rawData.workflowId;
    },
    get workflowName() {
      return rawData.workflowName;
    },
    get workflowWeekRunsMap() {
      return getWorkflowWeekRunsMap();
    },
    get formattedWorkflowRuns() {
      _cachedArray =
        _cachedArray ??
        getWorkflowsArray({
          workflowId: rawData.workflowId,
          weekRunsMap: weekRunsMap,
          weekRunsIdsMap: weekRunsIdsMap,
        });
      return _cachedArray ?? [];
    },
    get repositoryName() {
      return rawData.workflowParams.repo;
    },
    get repositoryOwner() {
      return rawData.workflowParams.owner;
    },
    get branchName() {
      return rawData.workflowParams.branchName;
    },
  } satisfies WorkFlowInstance;

  return instance;
};
