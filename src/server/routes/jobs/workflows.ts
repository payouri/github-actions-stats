import type { Hono } from "hono";
import { mountCreateNewWorkflowRoute } from "./createNewWorkflow.js";
import { mountRetrieveNewWorkflowsRoute } from "./retrieveNewWorkflows.js";
import { mountRetrieveOlderRunsRoute } from "./retrieveOldWorkflows.js";

export function buildJobsWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;

  mountRetrieveNewWorkflowsRoute({ app });
  mountCreateNewWorkflowRoute({ app });
  mountRetrieveOlderRunsRoute({ app });
}
