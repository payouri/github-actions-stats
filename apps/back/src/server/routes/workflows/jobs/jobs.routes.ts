import { Hono } from "hono";
import { JOBS_ROUTE_PATH } from "../constants.js";
import { mountRetrieveNewWorkflowsRoute } from "./retrieveNewWorkflows.js";
import { mountRetrieveOlderRunsRoute } from "./retrieveOldWorkflows.js";

export function mountJobsWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;
  const jobsRouter = new Hono<Env>();

  mountRetrieveNewWorkflowsRoute({ app: jobsRouter });
  mountRetrieveOlderRunsRoute({ app: jobsRouter });

  app.route(JOBS_ROUTE_PATH, jobsRouter);
}
