import { sortWorkflowMapKeys } from "../../../../entities/FormattedWorkflow/helpers/sortWorkflowMapKeys.js";
import { ProcessResponse } from "../../../../ProcessResponse.types.js";
import { workflowRunsStorage, workflowStorage } from "../storage.js";
import type { RetrievedWorkflow } from "../types.js";
import { generateWorkflowKey, generateWorkflowRunKey } from "./generateKey.js";

export const loadRetrievedWorkflowData = async (
  params: Pick<RetrievedWorkflow, "workflowName" | "workflowParams">
): Promise<ProcessResponse<RetrievedWorkflow>> => {
  try {
    const storedWorkflow = await workflowStorage.get(
      generateWorkflowKey(params)
    );
    if (!storedWorkflow) {
      return { hasFailed: true, error: new Error("WORKFLOW_NOT_FOUND") };
    }
    const storedRuns = await Promise.all(
      storedWorkflow.workflowsList.map((runId) =>
        workflowRunsStorage.get(
          generateWorkflowRunKey({
            repositoryName: params.workflowParams.repo,
            repositoryOwner: params.workflowParams.owner,
            branchName: params.workflowParams.branchName,
            runId,
            workflowName: params.workflowName,
          })
        )
      )
    );

    return {
      hasFailed: false,
      data: {
        ...storedWorkflow,
        workflowWeekRunsMap: sortWorkflowMapKeys(
          storedRuns.reduce<RetrievedWorkflow["workflowWeekRunsMap"]>(
            (acc, run) => {
              if (!run) return acc;

              if (!acc[run.week_year]) acc[run.week_year] = [];
              acc[run.week_year].push(run);

              return acc;
            },
            {}
          )
        ),
      },
    };
  } catch (error) {
    return {
      hasFailed: true,
      error: new Error("FAILED_TO_LOAD_WORKFLOW_DATA", {
        cause: error,
      }),
    };
  }
};
