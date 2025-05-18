import { Hono } from "hono";
import type { BlankEnv } from "hono/types";
import { buildGithubWebhooksRoutes } from "./webhooks.js";
import { GITHUB_ROUTE_PATH } from "./constants.js";

export function buildGithubRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;
  const githubRouter = new Hono<Env>();

  buildGithubWebhooksRoutes({ app: githubRouter });
  app.route(GITHUB_ROUTE_PATH, githubRouter);

  return {};
}
