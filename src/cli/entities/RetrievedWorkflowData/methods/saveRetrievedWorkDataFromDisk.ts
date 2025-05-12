import type { FormattedWorkflowRun } from "../../../../entities/FormattedWorkflow/types.js";
import { ProcessResponse } from "../../../../ProcessResponse.types.js";
import { workflowRunsStorage, workflowStorage } from "../storage.js";
import { RetrievedWorkflow } from "../types.js";
import {
  generateWorkflowKey,
  generateWorkflowRunKey,
} from "../../../../helpers/generateWorkflowKey.js";

function getRunsArrayAndMapToStore(
  runs: RetrievedWorkflow["workflowWeekRunsMap"],
  workflowData: {
    workflowName: string;
    repositoryName: string;
    repositoryOwner: string;
    branchName?: string;
  }
): {
  runsIds: number[];
  runsMap: {
    [runKey: string]: FormattedWorkflowRun & {
      workflowName: string;
      repositoryName: string;
      repositoryOwner: string;
      branchName?: string;
    };
  };
} {
  return Object.entries(runs).reduce<{
    runsIds: number[];
    runsMap: {
      [runKey: string]: FormattedWorkflowRun & {
        workflowName: string;
        repositoryName: string;
        repositoryOwner: string;
        branchName?: string;
      };
    };
  }>(
    (acc, [_, runs]) => {
      runs.forEach((run) => {
        const runKey = generateWorkflowRunKey({
          repositoryName: workflowData.repositoryName,
          repositoryOwner: workflowData.repositoryOwner,
          workflowName: workflowData.workflowName,
          branchName: workflowData.branchName,
          runId: run.runId,
        });

        acc.runsIds.push(run.runId);
        acc.runsMap[runKey] = {
          ...run,
          workflowName: workflowData.workflowName,
          repositoryName: workflowData.repositoryName,
          repositoryOwner: workflowData.repositoryOwner,
          branchName: workflowData.branchName,
        };
      });

      return acc;
    },
    { runsIds: [], runsMap: {} }
  );
}
export const saveRetrivedWorkflowRuns = async (data: {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
  runs: Record<number | string, FormattedWorkflowRun>;
}): Promise<ProcessResponse<void>> => {
  const { workflowName, repositoryName, repositoryOwner, branchName, runs } =
    data;
  const workflowKey = generateWorkflowKey({
    workflowName,
    workflowParams: {
      owner: repositoryOwner,
      repo: repositoryName,
      branchName,
    },
  });

  const workflowData = await workflowStorage.get(workflowKey);
  if (!workflowData) {
    return { hasFailed: true, error: new Error("Workflow data not found") };
  }
  const newRunsIds = Object.keys(runs);
  if (!newRunsIds.length) {
    await workflowStorage.set(workflowKey, workflowData);
    return { hasFailed: false };
  }

  const updatedRunsArray = new Set<number>(workflowData.workflowsList);
  for (const runId of newRunsIds) {
    updatedRunsArray.add(Number(runId));
  }

  const toSave = Object.entries(runs).reduce<
    Record<
      string,
      FormattedWorkflowRun & {
        workflowName: string;
        repositoryName: string;
        repositoryOwner: string;
        branchName?: string;
      }
    >
  >((acc, [runId, run]) => {
    const runKey = generateWorkflowRunKey({
      repositoryName,
      repositoryOwner,
      workflowName,
      branchName,
      runId: Number(runId),
    });

    acc[runKey] = {
      ...run,
      workflowName,
      repositoryName,
      repositoryOwner,
      branchName,
    };
    return acc;
  }, {});

  await Promise.all([
    workflowRunsStorage.setMany(toSave),
    workflowStorage.set(workflowKey, {
      ...workflowData,
      workflowsList: Array.from(updatedRunsArray).sort((a, b) => a - b),
    }),
  ]);

  return {
    hasFailed: false,
  };
};

export const saveRetrievedWorkflowData = async (
  data: RetrievedWorkflow,
  options?: { upsert?: boolean }
): Promise<ProcessResponse<void>> => {
  const { workflowName, workflowParams } = data;
  const { upsert = true } = options ?? {};
  const { owner, repo, branchName } = workflowParams;

  const workflowKey = generateWorkflowKey({
    workflowName,
    workflowParams: {
      owner,
      repo,
      branchName,
    },
  });

  let workflowData = await workflowStorage.get(workflowKey);
  if (!workflowData) {
    if (!upsert) {
      return { hasFailed: true, error: new Error("Workflow data not found") };
    }

    const { workflowWeekRunsMap, ...rest } = data;
    workflowData = {
      ...rest,
      workflowsList: [],
    };
  }

  const { runsIds, runsMap } = getRunsArrayAndMapToStore(
    data.workflowWeekRunsMap,
    {
      workflowName: data.workflowName,
      repositoryName: data.workflowParams.repo,
      repositoryOwner: data.workflowParams.owner,
      branchName: data.workflowParams.branchName,
    }
  );
  await Promise.all([
    workflowStorage.set(workflowKey, {
      ...workflowData,
      workflowsList: runsIds,
    }),
    workflowRunsStorage.setMany(runsMap),
  ]);

  return {
    hasFailed: false,
  };
};
