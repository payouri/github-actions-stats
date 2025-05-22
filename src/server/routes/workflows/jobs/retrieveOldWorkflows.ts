import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { z } from "zod";
import { processWorkflowJobQueue } from "../../../queue.js";
import { RETRIEVE_OLDER_RUNS_JOB_NAME } from "../../../../queues/methods/retrieveOldRuns.js";
import { DEFAULT_PENDING_JOB_GROUP } from "../../../../entities/PendingJob/constants.js";
import { DB } from "../../../../entities/db.js";

const ROUTE_PATH = "/older" as const;

const schema = z.object({
  workflowKey: z.string(),
});

export function mountRetrieveOlderRunsRoute<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;

  app.post(
    ROUTE_PATH,
    validator("json", (value) => {
      const parsedBody = schema.safeParse(value);
      if (!parsedBody.success) {
        throw new HTTPException(400, {
          message: "Validation Failed",
          res: new Response("Bad Request", {
            status: 400,
            statusText: "Validation Failed",
          }),
        });
      }

      return parsedBody.data;
    }),
    async (c) => {
      const { workflowKey } = await c.req.json();

      const addJobResult = await DB.mutations.createPendingJob({
        data: {
          workflowKey,
        },
        group: DEFAULT_PENDING_JOB_GROUP,
        method: RETRIEVE_OLDER_RUNS_JOB_NAME,
      });

      if (addJobResult.hasFailed) {
        throw new HTTPException(500, {
          res: new Response("Internal Server Error", {
            status: 500,
            statusText: "Internal Server Error",
          }),
        });
      }

      return c.json({ message: "Process will start shortly" });
    }
  );
}
