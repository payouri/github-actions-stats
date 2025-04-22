import type { MethodResult } from "../../../types/MethodResult.js";
import { retrievedWorkflowService } from "../../entities/RetrievedWorkflowData/index.js";
import { createWorkflowInstance } from "../../entities/RetrievedWorkflowData/methods/createWorkflowInstance.js";
import type { WorkFlowInstance } from "../../entities/RetrievedWorkflowData/types.js";

export type GetWorkflowInstanceParams = {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
};

export type GetWorkflowInstanceResponse = MethodResult<
  WorkFlowInstance,
  "failed_to_load_workflow_data"
>;

export async function getWorkflowInstance(
  params: GetWorkflowInstanceParams
): Promise<GetWorkflowInstanceResponse> {
  const { workflowName, repositoryName, repositoryOwner, branchName } = params;

  const workflowDataResponse =
    await retrievedWorkflowService.loadRetrievedWorkflowData({
      workflowName,
      workflowParams: {
        owner: repositoryOwner,
        repo: repositoryName,
        branchName,
      },
    });

  if (workflowDataResponse.hasFailed) {
    return {
      hasFailed: true,
      error: {
        code: "failed_to_load_workflow_data",
        message: workflowDataResponse.error.message,
        error: workflowDataResponse.error,
        data: undefined,
      },
    };
  }

  return {
    hasFailed: false,
    data: createWorkflowInstance(workflowDataResponse.data),
  };
}
