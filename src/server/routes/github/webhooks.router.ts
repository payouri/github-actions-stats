import type { Hono } from "hono";
import { mountGithubWebhookValidationMiddleware } from "../../middlewares/githubWebhookValidationMiddleware.js";
import type { HonoRequestContext } from "../../types.js";
import { GITHUB_CONFIG } from "../../../config/github.js";
import logger from "../../../lib/Logger/logger.js";

export function mountGithubWebhooksRoutes<
  Env extends HonoRequestContext
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;

  if (!GITHUB_CONFIG.webhookSecret) {
    logger.warn("GITHUB_WEBHOOK_SECRET is not set");
  } else {
    mountGithubWebhookValidationMiddleware({
      app,
      githubWebhookSecret: GITHUB_CONFIG.webhookSecret,
    });
  }
  app.post("/webhooks", async (c) => {
    // console.log(
    //   await c.req.parseBody({
    //     all: true,
    //   })
    // );
    const data = await c.req.json();
    console.log(data.workflow_run);

    return c.json({ status: "not_handled" });
  });

  return {};
}
