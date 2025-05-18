import { Hono } from "hono";
import { JOBS_ROUTE_PATH, WORKFLOWS_ROUTE_PATH } from "./constants.js";
import { mountGetWorkflowByKeyRoute } from "./getWorkflowByKey.js";
import { mountJobsWorkflowsRoutes } from "./jobs/jobs.routes.js";

export function mountWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;
  const workflowsRouter = new Hono<Env>();

  mountJobsWorkflowsRoutes({ app: workflowsRouter });
  mountGetWorkflowByKeyRoute({ app: workflowsRouter });

  app.route(WORKFLOWS_ROUTE_PATH, workflowsRouter);
}
