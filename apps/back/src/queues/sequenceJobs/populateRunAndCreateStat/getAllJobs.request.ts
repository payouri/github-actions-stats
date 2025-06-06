import type { components } from "@octokit/openapi-types";
import githubClient from "../../../lib/githubClient.js";
import { AbortError } from "../../../errors/AbortError.js";

export async function getAllJobs(
	params: {
		runId: number;
		repositoryOwner: string;
		repositoryName: string;
	},
	options?: { abortSignal?: AbortSignal },
) {
	const { runId, repositoryOwner, repositoryName } = params;
	const { abortSignal } = options ?? {};

	const retrievedJobs: components["schemas"]["job"][] = [];
	let totalCount = 0;

	do {
		if (abortSignal?.aborted) {
			throw new AbortError({
				message: "Fetching jobs aborted",
				signal: abortSignal,
				abortReason: "abort_signal_aborted",
			});
		}

		const response = await githubClient.rest.actions.listJobsForWorkflowRun({
			owner: repositoryOwner,
			repo: repositoryName,
			run_id: runId,
			per_page: 100,
			filter: "latest",
			page: 1 + Math.floor(retrievedJobs.length / 100),
		});

		totalCount = response.data.total_count;
		if (!response.data.jobs.length) {
			break;
		}
		for (const job of response.data.jobs) {
			retrievedJobs.push(job);
		}
	} while (retrievedJobs.length < totalCount);

	return retrievedJobs;
}
