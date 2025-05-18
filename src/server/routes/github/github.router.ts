import { Hono } from "hono";
import type { BlankEnv } from "hono/types";
import { mountGithubWebhooksRoutes } from "./webhooks.router.js";
import { GITHUB_ROUTE_PATH } from "./constants.js";

export function mountGithubRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;
  const githubRouter = new Hono<Env>();

  mountGithubWebhooksRoutes({ app: githubRouter });
  app.route(GITHUB_ROUTE_PATH, githubRouter);

  return {};
}
