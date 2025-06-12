import {
	WORKFLOW_MOUNT_POINT,
	type WorkflowRouter,
} from "@github-actions-stats/workflow-client";
import { QueryCache, QueryClient } from "@tanstack/react-query";
import {
	createTRPCQueryUtils,
	createTRPCReact,
	httpBatchLink,
} from "@trpc/react-query";
import SuperJSON from "superjson";

const DEFAULT_QUERIES_STALE_TIME_MS = 10 * 60 * 1000; // 10 minutes

export const trpcReactClient = createTRPCReact<WorkflowRouter>().createClient({
	links: [
		httpBatchLink({
			url: new URL(
				WORKFLOW_MOUNT_POINT,
				"https://ghstats.pailloux-youri.xyz",
			).toString(),
			transformer: SuperJSON,
		}),
	],
});
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: DEFAULT_QUERIES_STALE_TIME_MS,
		},
	},
});

export const queryClientUtils = createTRPCQueryUtils({
	client: trpcReactClient,
	queryClient,
});

export const useRequest = () => {};
