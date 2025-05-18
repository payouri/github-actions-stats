import type { Hono } from "hono";
import { mountGithubRoutes } from "./github/github.router.js";
import { mountWorkflowsRoutes } from "./workflows/workflows.js";
import type { BlankEnv } from "hono/types";

export function buildRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  mountGithubRoutes(dependencies);
  mountWorkflowsRoutes(dependencies);

  app.get("/healthcheck", async (c) => {
    return c.text("OK");
  });
}
