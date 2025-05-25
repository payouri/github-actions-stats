import type { TRPCBuilder } from "./types.js";

export const WORKFLOW_MOUNT_POINT = "/api/currency-converter" as const;

export const buildWorkflowRouter = <Builder extends TRPCBuilder>(dependencies: {
	trpc: Builder;
}) => {
	const { trpc } = dependencies;
	const trpcInstance = trpc.create({});
	const router = trpcInstance.router;
	const procedures = {};

	return {
		procedures,
		router: router(procedures),
		trpcInstance,
	};
};
