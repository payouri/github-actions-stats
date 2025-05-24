import { Hono } from "hono";
import { WORKFLOWS_ROUTE_PATH } from "./constants.js";
import { mountGetWorkflowByKeyRoute } from "./getWorkflowByKey.js";
import { mountJobsWorkflowsRoutes } from "./jobs/jobs.routes.js";
import { mountListWorkflowRunsPaginatedRoute } from "./listWorkflowRunsPaginated.js";
import { mountCreateNewWorkflowRoute } from "./createNewWorkflow.js";

export function mountWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;
  const workflowsRouter = new Hono<Env>();

  mountCreateNewWorkflowRoute({ app: workflowsRouter });
  mountListWorkflowRunsPaginatedRoute({ app: workflowsRouter });
  mountGetWorkflowByKeyRoute({ app: workflowsRouter });
  mountJobsWorkflowsRoutes({ app: workflowsRouter });

  app.route(WORKFLOWS_ROUTE_PATH, workflowsRouter);
}
