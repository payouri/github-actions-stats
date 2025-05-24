import type { FormattedWorkflowRun } from "@github-actions-stats/workflow-entity";
import type { SaveWorkflowDataMethod } from "../../../../entities/FormattedWorkflow/storage/methods/saveWorkflowData.js";
import {
	generateWorkflowKey,
	generateWorkflowRunKey,
} from "../../../../helpers/generateWorkflowKey.js";
import { isExistingWorkflowData } from "../../../entities/RetrievedWorkflowData/methods/isExistingWorkflowData.js";
import { saveRetrivedWorkflowRuns as saveRetrievedWorkflowRuns } from "../../../entities/RetrievedWorkflowData/methods/saveRetrievedWorkDataFromDisk.js";
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

	const workflowKey = generateWorkflowKey({
		workflowName,
		workflowParams: {
			owner: repositoryOwner,
			repo: repositoryName,
			branchName,
		},
	});

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
		await workflowStorage.set(workflowKey, {
			...workflowData,
			workflowParams: {
				owner: repositoryOwner,
				repo: repositoryName,
				branchName,
			},
			workflowsList: [],
		});
	}

	if (newOrUpdatedRuns?.length) {
		const saveResponse = await saveRetrievedWorkflowRuns({
			repositoryName,
			repositoryOwner,
			workflowName,
			branchName,
			runs: newOrUpdatedRuns.reduce<Record<number, FormattedWorkflowRun>>(
				(acc, run) => {
					acc[run.runId] = run;
					return acc;
				},
				{},
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
		return {
			hasFailed: false,
			data: {
				workflowKey,
				savedRunsKeys: newOrUpdatedRuns.map((run) =>
					generateWorkflowRunKey({
						repositoryName,
						repositoryOwner,
						workflowName,
						runId: run.runId,
						branchName,
					}),
				),
			},
		};
	}

	const runs = Object.values(workflowData.workflowWeekRunsMap).reduce<
		Record<number, FormattedWorkflowRun>
	>((acc, runs) => {
		// biome-ignore lint/complexity/noForEach: <explanation>
		runs.forEach((run) => {
			acc[run.runId] = run;
		});
		return acc;
	}, {});

	const saveResponse = await saveRetrievedWorkflowRuns({
		repositoryName,
		repositoryOwner,
		workflowName,
		branchName,
		runs,
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

	return {
		hasFailed: false,
		data: {
			workflowKey,
			savedRunsKeys: Object.keys(runs).map((runId) =>
				generateWorkflowRunKey({
					repositoryName,
					repositoryOwner,
					workflowName,
					runId: Number(runId),
					branchName,
				}),
			),
		},
	};
}
