import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { WorkflowRouter } from "./router.js";

export function buildWorkflowClient(params: {
	serverUrl: string;
}) {
	return createTRPCClient<WorkflowRouter>({
		links: [httpBatchLink({ url: params.serverUrl })],
	});
}
