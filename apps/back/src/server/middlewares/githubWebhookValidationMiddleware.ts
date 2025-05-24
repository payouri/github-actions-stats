import type { Hono } from "hono";
import type { HonoRequestContext } from "../types.js";
import logger from "../../lib/Logger/logger.js";
import { HTTPException } from "hono/http-exception";
import { createHmac } from "node:crypto";

export function mountGithubWebhookValidationMiddleware<
  Env extends HonoRequestContext
>(dependencies: { app: Hono<Env>; githubWebhookSecret: string }) {
  const { app, githubWebhookSecret } = dependencies;

  app.use(async (context, next) => {
    // Get the signature from the header
    const signature = context.req.header("x-hub-signature-256");

    if (!signature) {
      logger.error("Github request signature is missing");
      throw new HTTPException(401, {
        message: "Unauthorized",
        res: new Response("Unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        }),
      });
    }

    const payload = await context.req.text();
    // Calculate the expected signature
    const hmac = createHmac("sha256", githubWebhookSecret);
    const expectedSignature = `sha256=${hmac.update(payload).digest("hex")}`;
    if (signature !== expectedSignature) {
      logger.error("Github request signature is invalid");
      throw new HTTPException(401, {
        message: "Unauthorized",
        res: new Response("Unauthorized", {
          status: 401,
          statusText: "Unauthorized",
        }),
      });
    }

    await next();
  });
}
