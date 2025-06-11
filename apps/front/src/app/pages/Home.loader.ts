import { useLoaderData, useRouteLoaderData } from "react-router";
import { queryClientUtils, trpcReactClient } from "../hooks/useRequest";

export async function HomePageLoader(params?: {
	start?: number;
	count?: number;
}) {
	const { start = 0, count = 10 } = params ?? {};

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
export const useRouteHomePageDataLoader = () => {
	const res =
		useRouteLoaderData<Awaited<ReturnType<typeof HomePageLoader>>>("root");
	if (!res?.workflows) {
		throw new Error("Workflows are not loaded");
	}
	if (res.workflows.hasFailed) {
		throw new Error("Workflows failed to load");
	}

	return res.workflows.data;
};
