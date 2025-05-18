import type { Hono } from "hono";
import type { HonoRequestContext } from "../types.js";
import { mountGithubRoutes } from "./github/github.router.js";
import { mountWorkflowsRoutes } from "./workflows/workflows.js";

export function buildRoutes<Env extends HonoRequestContext>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  mountGithubRoutes(dependencies);
  mountWorkflowsRoutes(dependencies);

  app.get("/healthcheck", async (c) => {
    return c.text("OK");
  });
}
