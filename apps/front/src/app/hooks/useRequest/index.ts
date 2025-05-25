import {
	WORKFLOW_MOUNT_POINT,
	buildWorkflowClient,
} from "@github-actions-stats/workflow-client";
import { QueryClient } from "@tanstack/react-query";
import { createTRPCQueryUtils } from "@trpc/react-query";
import { lazy } from "react";
// import

export const queryClient = new QueryClient({});
export const trpcClient = buildWorkflowClient({
	serverUrl: new URL(
		WORKFLOW_MOUNT_POINT,
		"https://ghstats.pailloux-youri.xyz",
	).toString(),
});

export const makeRequest = createTRPCQueryUtils({
	client: trpcClient,
	queryClient,
});

export const useRequest = () => {};
