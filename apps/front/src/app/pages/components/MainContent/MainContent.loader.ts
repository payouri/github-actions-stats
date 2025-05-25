import { useLoaderData } from "react-router";

export async function loadMainContentData(params: { workflowKey: string }) {
	return {
		workflowKey: params.workflowKey,
	};
}

export const useMainContentDataLoader = useLoaderData<
	Awaited<ReturnType<typeof loadMainContentData>>
>;
