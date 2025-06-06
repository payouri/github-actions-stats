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
import githubClient from "../../lib/githubClient.js";

export function mountTrpcServer<Env extends BlankEnv>(params: {
	app: Hono<Env>;
}) {
	const { app } = params;
	const { router } = buildWorkflowRouter({
		trpc: initTRPC,
		storedWorkflowMongoStorage: workflowMongoStorage,
		storedWorkflowRunMongoStorage: workflowRunsMongoStorage,
		aggregatedWorkflowStatsMongoStorage: aggregatedWorkflowStatsMongoStorage,
		workflowStatsMongoStorage: workflowRunStatsMongoStorage,
		githubClient: githubClient.rest,
	});

	app.use(
		join(WORKFLOW_MOUNT_POINT, "*"),
		cors({
			origin: "http://localhost:3000",
			allowMethods: ["GET", "POST", "PUT", "DELETE"],
			allowHeaders: [
				"Content-Type",
				"Content-Encoding",
				"Content-Length",
				"Authorization",
				"Accept",
				"Cache-Control",
			],
			// allowHeaders: "*",
			exposeHeaders: [
				"Content-Length",
				"Content-Type",
				"ETag",
				"Cache-Control",
				"Accept-Encoding",
			],
			credentials: true,
			maxAge: 60 * 60,
		}),
		trpcServer({ router, endpoint: WORKFLOW_MOUNT_POINT }),
	);
}
