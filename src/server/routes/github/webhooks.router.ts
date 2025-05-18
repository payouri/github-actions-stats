import type { Hono } from "hono";
import type { BlankEnv } from "hono/types";

export function mountGithubWebhooksRoutes<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  app.post("/webhooks", async (c) => {
    // console.log(
    //   await c.req.parseBody({
    //     all: true,
    //   })
    // );
    console.log(await c.req.json());

    return c.json({ status: "not_handled" });
  });

  return {};
}
