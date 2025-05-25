import type { TRPCBuilder } from "./types.js";

export const WORKFLOW_MOUNT_POINT = "/api/currency-converter" as const;

export const buildWorkflowRouter = (dependencies: {
	trpc: TRPCBuilder;
}) => {
	const { trpc } = dependencies;
	const trpcInstance = trpc.create({});
	const router = trpcInstance.router;

	return {
		procedures,
		router: router(procedures),
		trpcInstance,
	};
};
