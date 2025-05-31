import { useLoaderData } from "react-router";
import { queryClientUtils, trpcReactClient } from "../hooks/useRequest";

export async function HomePageLoader(params: {
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 10 } = params;

	const [workflows] = await Promise.all([
		queryClientUtils.getWorkflows.ensureData({
			count,
			start,
		}),
	]);

	return {
		workflows,
	};
}
export const useHomePageData = useLoaderData<
	Awaited<ReturnType<typeof HomePageLoader>>
>;
