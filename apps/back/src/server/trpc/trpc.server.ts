import {
	WORKFLOW_MOUNT_POINT,
	buildWorkflowRouter,
} from "@github-actions-stats/workflow-client";
import { trpcServer } from "@hono/trpc-server";
import { initTRPC } from "@trpc/server";
import type { Hono } from "hono";
import { cors } from "hono/cors";
import type { BlankEnv } from "hono/types";
import { join } from "node:path";
import { DB } from "../../entities/db.js";
import {
	workflowMongoStorage,
	workflowRunsMongoStorage,
} from "../../entities/FormattedWorkflow/storage/mongo.js";
import { pendingJobsMongoStorage } from "../../entities/PendingJob/storage/mongo.js";
import {
	aggregatedWorkflowStatsMongoStorage,
	workflowRunStatsMongoStorage,
} from "../../entities/WorkflowStat/storage/mongo.js";
import githubClient from "../../lib/githubClient.js";
import { globalServerAbortController } from "../globalServerAbortController.js";

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
		pendingJobsMongoStorage: pendingJobsMongoStorage,
		githubClient: githubClient.rest,
		abortSignal: globalServerAbortController.signal,
		getAggregatedWorkflowStats: DB.mutations.aggregateAndSaveStats,
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
