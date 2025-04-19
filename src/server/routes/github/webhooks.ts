import type { Hono } from "hono";
import type { BlankEnv } from "hono/types";

export function buildGithubWebhooksRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  app.post("/github/webhooks", async (c) => {
    return c.json({ message: "Hello World" });
  });

  return {};
}
