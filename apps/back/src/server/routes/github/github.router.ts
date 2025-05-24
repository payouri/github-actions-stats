import { Hono } from "hono";
import type { HonoRequestContext } from "../../types.js";
import { GITHUB_ROUTE_PATH } from "./constants.js";
import { mountGithubWebhooksRoutes } from "./webhooks.router.js";

export function mountGithubRoutes<
  Env extends HonoRequestContext
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;
  const githubRouter = new Hono<Env>();

  mountGithubWebhooksRoutes({ app: githubRouter });
  app.route(GITHUB_ROUTE_PATH, githubRouter);

  return {};
}
