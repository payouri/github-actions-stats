import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { z } from "zod";
import { processWorkflowJobQueue } from "../../../queue.js";
import { RETRIEVE_WORKFLOW_UPDATES_JOB_NAME } from "../../../../queues/methods/retrieveWorkflowUpdates.js";

const ROUTE_PATH = "/new" as const;

const schema = z.object({
  workflowKey: z.string(),
});

export function mountRetrieveNewWorkflowsRoute<
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

      const addJobResult = await processWorkflowJobQueue.addJob({
        jobName: RETRIEVE_WORKFLOW_UPDATES_JOB_NAME,
        jobData: {
          workflowKey,
        },
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
