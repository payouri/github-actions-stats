import type { Hono } from "hono";
import type { BlankEnv } from "hono/types";
import { DB } from "../../../entities/db.js";
import { HTTPException } from "hono/http-exception";

export function mountGetWorkflowByKeyRoute<Env extends BlankEnv>(dependencies: {
  app: Hono<Env>;
}) {
  const { app } = dependencies;

  app.get("/:workflowKey", async (c) => {
    const { workflowKey } = c.req.param();
    const workflowData = await DB.queries.getWorkflowData({ workflowKey });

    if (!workflowData) {
      throw new HTTPException(404, {
        message: "Workflow not found",
        res: new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
        }),
      });
    }

    return c.json(workflowData);
  });
}
