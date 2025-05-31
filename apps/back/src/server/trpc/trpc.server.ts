import {
	buildWorkflowRouter,
	WORKFLOW_MOUNT_POINT,
} from "@github-actions-stats/workflow-client";
import { cors } from "hono/cors";
import { initTRPC } from "@trpc/server";
import {
	workflowMongoStorage,
	workflowRunsMongoStorage,
} from "../../entities/FormattedWorkflow/storage/mongo.js";
import type { BlankEnv } from "hono/types";
import { trpcServer } from "@hono/trpc-server";
import type { Hono } from "hono";
import { join } from "node:path";
import {
	aggregatedWorkflowStatsMongoStorage,
	workflowRunStatsMongoStorage,
} from "../../entities/WorkflowStat/storage/mongo.js";

const { router } = buildWorkflowRouter({
	trpc: initTRPC,
	storedWorkflowMongoStorage: workflowMongoStorage,
	storedWorkflowRunMongoStorage: workflowRunsMongoStorage,
	aggregatedWorkflowStatsMongoStorage: aggregatedWorkflowStatsMongoStorage,
	workflowStatsMongoStorage: workflowRunStatsMongoStorage,
});

export function mountTrpcServer<Env extends BlankEnv>(params: {
	app: Hono<Env>;
}) {
	const { app } = params;

	app.use(
		join(WORKFLOW_MOUNT_POINT, "*"),
		cors({
			origin: "http://localhost:3000",
			allowMethods: ["GET", "POST", "PUT", "DELETE"],
			allowHeaders: ["Content-Type", "Authorization"],
			credentials: true,
			maxAge: 60 * 60,
		}),
		trpcServer({ router, endpoint: WORKFLOW_MOUNT_POINT }),
	);
}
