import { join } from "node:path";
import type { RetrievedWorkflow } from "../types.js";

function replaceSpacesWithUnderscores(str: string) {
	return str.replaceAll(/\s/g, "_");
}

export function generateWorkflowKey(
	params: Pick<RetrievedWorkflow, "workflowParams" | "workflowName">,
): string {
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
		return replaceSpacesWithUnderscores(base).toLowerCase();
	}

	return replaceSpacesWithUnderscores(`${base}/${branchName}`).toLowerCase();
}

export const generateWorkflowRunKey = (
	params:
		| {
				workflowName: string;
				repositoryName: string;
				repositoryOwner: string;
				branchName?: string;
				runId: number;
		  }
		| {
				workflowKey: string;
				runId: number;
		  },
): string => {
	if ("workflowKey" in params) {
		return join(params.workflowKey, params.runId.toString());
	}

	const { workflowName, repositoryName, repositoryOwner, branchName, runId } =
		params;

	const base = join(
		branchName
			? `${repositoryOwner}/${repositoryName}/${workflowName}/${branchName}`
			: `${repositoryOwner}/${repositoryName}/${workflowName}`,
		runId.toString(),
	);

	return replaceSpacesWithUnderscores(base).toLowerCase();
};

export const getWorkflowParamsFromKey = (
	key: string,
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
