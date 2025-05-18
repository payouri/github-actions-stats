import type { Hono } from "hono";
import { buildGithubWebhooksRoutes } from "./github/webhooks.js";
import { mountWorkflowsRoutes } from "./workflows/workflows.js";
import type { BlankEnv } from "hono/types";

export function buildRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  buildGithubWebhooksRoutes(dependencies);
  mountWorkflowsRoutes(dependencies);

  app.get("/healthcheck", async (c) => {
    return c.text("OK");
  });
}
