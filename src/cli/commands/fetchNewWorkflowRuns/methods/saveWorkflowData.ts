import type { FormattedWorkflowRun } from "../../../../entities/FormattedWorkflow/types.js";
import type { SaveWorkflowDataMethod } from "../../../../features/getWorkflowInstance/methods/saveWorkflowData.js";
import { generateWorkflowKey } from "../../../entities/RetrievedWorkflowData/methods/generateKey.js";
import { isExistingWorkflowData } from "../../../entities/RetrievedWorkflowData/methods/isExistingWorkflowData.js";
import { saveRetrivedWorkflowRuns } from "../../../entities/RetrievedWorkflowData/methods/saveRetrievedWorkDataFromDisk.js";
import { workflowStorage } from "../../../entities/RetrievedWorkflowData/storage.js";

export async function saveWorkflowData(
  ...args: Parameters<SaveWorkflowDataMethod>
): ReturnType<SaveWorkflowDataMethod> {
  const [
    {
      workflowName,
      repositoryName,
      repositoryOwner,
      branchName,
      workflowData,
      newOrUpdatedRuns,
    },
  ] = args;

  if (
    !(await isExistingWorkflowData({
      workflowName,
      workflowParams: {
        owner: repositoryOwner,
        repo: repositoryName,
        branchName,
      },
    }))
  ) {
    await workflowStorage.set(
      generateWorkflowKey({
        workflowName,
        workflowParams: {
          owner: repositoryOwner,
          repo: repositoryName,
          branchName,
        },
      }),
      {
        ...workflowData,
        workflowParams: {
          owner: repositoryOwner,
          repo: repositoryName,
          branchName,
        },
        workflowsList: [],
      }
    );
  }

  if (newOrUpdatedRuns?.length) {
    const saveResponse = await saveRetrivedWorkflowRuns({
      repositoryName,
      repositoryOwner,
      workflowName,
      branchName,
      runs: newOrUpdatedRuns.reduce<Record<number, FormattedWorkflowRun>>(
        (acc, run) => {
          acc[run.runId] = run;
          return acc;
        },
        {}
      ),
    });
    if (saveResponse.hasFailed)
      return {
        hasFailed: true,
        error: {
          code: "failed_to_save_workflow_data",
          message: saveResponse.error.message,
          error: saveResponse.error,
          data: args[0],
        },
      };
    return { hasFailed: false, data: workflowData };
  }

  const saveResponse = await saveRetrivedWorkflowRuns({
    repositoryName,
    repositoryOwner,
    workflowName,
    branchName,
    runs: Object.values(workflowData.workflowWeekRunsMap).reduce<
      Record<number, FormattedWorkflowRun>
    >((acc, runs) => {
      runs.forEach((run) => {
        acc[run.runId] = run;
      });
      return acc;
    }, {}),
  });

  if (saveResponse.hasFailed) {
    return {
      hasFailed: true,
      error: {
        code: "failed_to_save_workflow_data",
        message: saveResponse.error.message,
        error: saveResponse.error,
        data: args[0],
      },
    };
  }

  return { hasFailed: false, data: workflowData };
}
