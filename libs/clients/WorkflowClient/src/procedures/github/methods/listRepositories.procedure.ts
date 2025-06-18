import { type Octokit, RequestError as OctokitRequestError } from "octokit";
import { z } from "zod";
import type { ProcedureResponse } from "../../../types.js";

export const listRepositoriesProcedureInputSchema = z.object({
	cursor: z.number().nullish(),
	count: z.number().max(100).min(1),
});

export type ListRepositoriesProcedureInput = z.infer<
	typeof listRepositoriesProcedureInputSchema
>;
export type ListRepositoriesProcedureResponse = ProcedureResponse<
	{
		repositories: {
			owner: string;
			name: string;
		}[];
		nextCursor: number | null;
	},
	{ code: "failed_to_get_repositories"; message: string }
>;

export function buildListRepositoriesProcedure(dependencies: {
	githubClient: Octokit["rest"];
}) {
	const { githubClient } = dependencies;
	return async function createWorkflowProcedure(workflowDataParams: {
		input: ListRepositoriesProcedureInput;
	}): Promise<ListRepositoriesProcedureResponse> {
		const {
			input: { count, cursor = 1 },
		} = workflowDataParams;

		try {
			const response = await githubClient.repos.listForAuthenticatedUser({
				per_page: count,
				page: cursor ?? 1,
				sort: "updated",
			});
			if (response.status > 200) {
				return {
					hasFailed: true,
					code: "failed_to_get_repositories",
					message: "Failed to get repositories",
				};
			}
			return {
				hasFailed: false,
				data: {
					repositories: response.data.map((r) => ({
						name: r.full_name,
						owner: r.owner.login,
					})),
					nextCursor: response.data.length === count ? (cursor ?? 1) + 1 : null,
				},
			};
		} catch (error) {
			if (error instanceof OctokitRequestError) {
				return {
					hasFailed: true,
					code: "failed_to_get_repositories",
					message: error.message,
				};
			}
			return {
				hasFailed: true,
				code: "failed_to_get_repositories",
				message:
					error instanceof Error
						? `[${error.name}]: ${error.message}`
						: JSON.stringify(error),
			};
		}
	};
}
