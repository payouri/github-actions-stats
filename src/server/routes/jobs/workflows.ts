import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { z } from "zod";
import { processWorkflowJobQueue } from "../../queue.js";
import { generateWorkflowKey } from "../../../cli/entities/RetrievedWorkflowData/methods/generateKey.js";

export function buildJobsWorkflowsRoutes<
  Env extends Record<string, unknown>
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;

  const zodSchema = z.object({
    workflowKey: z.string(),
  });

  app.post(
    "/jobs/workflows",
    validator("json", (value) => {
      const parsedBody = zodSchema.safeParse(value);
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
        jobName: "retrieve-workflow-updates",
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
