import { queryClientUtils } from "../../hooks/useRequest";

export async function createWorkflow(params: {
	organization: string;
	repository: string;
	workflowId: number;
}) {
	const { organization, repository, workflowId } = params;

	const response = await queryClientUtils.upsertWorkflow({
		workflowId,
		githubOwner: organization,
		githubRepository: repository,
	});

	return response;
}
