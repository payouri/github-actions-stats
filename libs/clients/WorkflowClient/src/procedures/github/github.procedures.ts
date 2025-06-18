import type { TRPCBuilder } from "@trpc/server";
import type { Octokit } from "octokit";
import {
	buildListRepositoryWorkflowProcedure,
	listRepositoryWorkflowProcedureInputSchema,
} from "./methods/listWorkflows.procedure.js";
import {
	buildListRepositoriesProcedure,
	listRepositoriesProcedureInputSchema,
} from "./methods/listRepositories.procedure.js";

export {
	listRepositoriesProcedureInputSchema,
	listRepositoryWorkflowProcedureInputSchema,
};

export type BuildGitHubProceduresDependencies<
	Context extends object,
	Meta extends object,
> = {
	trpcInstance: ReturnType<TRPCBuilder<Context, Meta>["create"]>;
	githubClient: Octokit["rest"];
};

export function buildGitHubProcedures<
	Context extends object,
	Meta extends object,
>(dependencies: BuildGitHubProceduresDependencies<Context, Meta>) {
	const { trpcInstance } = dependencies;
	const listRepositoryWorkflowProcedure =
		buildListRepositoryWorkflowProcedure(dependencies);
	const listRepositoriesProcedure =
		buildListRepositoriesProcedure(dependencies);

	return {
		listGithubRepositories: trpcInstance.procedure
			.input(listRepositoriesProcedureInputSchema)
			.query(listRepositoriesProcedure),
		listGithubRepoWorkflows: trpcInstance.procedure
			.input(listRepositoryWorkflowProcedureInputSchema)
			.query(listRepositoryWorkflowProcedure),
	};
}
