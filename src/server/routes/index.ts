import type { Hono } from "hono";
import { buildGithubWebhooksRoutes } from "./github/webhooks.js";
import { buildJobsWorkflowsRoutes } from "./jobs/workflows.js";
import type { BlankEnv } from "hono/types";

export function buildRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  buildGithubWebhooksRoutes(dependencies);
  buildJobsWorkflowsRoutes(dependencies);

  app.get("/healthcheck", async (c) => {
    return c.text("OK");
  });
}
