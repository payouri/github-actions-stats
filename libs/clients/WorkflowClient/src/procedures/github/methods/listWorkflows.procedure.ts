import { type Octokit, RequestError as OctokitRequestError } from "octokit";
import { z } from "zod";
import type { ProcedureResponse } from "../../../types.js";

export const listRepositoryWorkflowProcedureInputSchema = z.object({
	cursor: z.number().nullish(),
	count: z.number().max(100).min(1),
	repository: z.string().min(1),
	owner: z.string().min(1),
});

export type ListRepositoryWorkflowProcedureInput = z.infer<
	typeof listRepositoryWorkflowProcedureInputSchema
>;
export type ListRepositoryWorkflowProcedureResponse = ProcedureResponse<
	{
		workflows: {
			id: number;
			name: string;
		}[];
		nextCursor: number | null;
		totalCount: number;
	},
	{ code: "failed_to_get_repository_workflows"; message: string }
>;

export function buildListRepositoryWorkflowProcedure(dependencies: {
	githubClient: Octokit["rest"];
}) {
	const { githubClient } = dependencies;
	return async function createWorkflowProcedure(workflowDataParams: {
		input: ListRepositoryWorkflowProcedureInput;
	}): Promise<ListRepositoryWorkflowProcedureResponse> {
		const {
			input: { count, cursor = 1, owner, repository },
		} = workflowDataParams;

		try {
			const response = await githubClient.actions.listRepoWorkflows({
				per_page: count,
				page: cursor ?? 1,
				sort: "updated",
				owner,
				repo: repository,
			});
			if (response.status > 200) {
				return {
					hasFailed: true,
					code: "failed_to_get_repository_workflows",
					message: "Failed to get repositories",
				};
			}
			return {
				hasFailed: false,
				data: {
					workflows: response.data.workflows.map((w) => ({
						id: w.id,
						name: w.name,
					})),
					totalCount: response.data.total_count,
					nextCursor:
						response.data.workflows.length === count ? (count ?? 1) + 1 : null,
				},
			};
		} catch (error) {
			if (error instanceof OctokitRequestError) {
				return {
					hasFailed: true,
					code: "failed_to_get_repository_workflows",
					message: error.message,
				};
			}
			return {
				hasFailed: true,
				code: "failed_to_get_repository_workflows",
				message:
					error instanceof Error
						? `[${error.name}]: ${error.message}`
						: JSON.stringify(error),
			};
		}
	};
}
