import { join } from "node:path";
import type { RetrievedWorkflow } from "./snapshot.types.js";

function replaceSpacesWithUnderscores(str: string) {
  return str.replaceAll(/\s/g, "_");
}

/** @deprecated do not use */
export function generateOldWorkflowKey(
  params: Pick<RetrievedWorkflow, "workflowParams" | "workflowName">
) {
  const {
    workflowName,
    workflowParams: {
      owner: repositoryOwner,
      repo: repositoryName,
      branchName,
    },
  } = params;

  const base = `${repositoryOwner}/${repositoryName}/${workflowName}`;
  if (!branchName) {
    return replaceSpacesWithUnderscores(base);
  }

  return replaceSpacesWithUnderscores(`${base}/${branchName}`);
}

/** @deprecated do not use */
export const generateOldWorkflowRunKey = (params: {
  workflowName: string;
  repositoryName: string;
  repositoryOwner: string;
  branchName?: string;
  runId: number;
}) => {
  const { workflowName, repositoryName, repositoryOwner, branchName, runId } =
    params;

  const base = join(
    branchName
      ? `${repositoryOwner}/${repositoryName}/${workflowName}/${branchName}`
      : `${repositoryOwner}/${repositoryName}/${workflowName}`,
    runId.toString()
  );

  return replaceSpacesWithUnderscores(base);
};

export const getWorkflowParamsFromKey = (
  key: string
): {
  repositoryName: string;
  repositoryOwner: string;
  workflowName: string;
  branchName?: string;
} => {
  const [owner, repo, workflowName, branchName] = key.split("/");

  if (!branchName) {
    return {
      repositoryOwner: owner,
      repositoryName: repo,
      workflowName: workflowName.replaceAll("_", " "),
      branchName: undefined,
    };
  }

  return {
    repositoryOwner: owner,
    repositoryName: repo,
    workflowName,
    branchName,
  };
};
