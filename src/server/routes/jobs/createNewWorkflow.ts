import type { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { validator } from "hono/validator";
import { workflowStorage } from "../../../entities/FormattedWorkflow/storage/mongo.js";
import type { z } from "zod";
import { generateWorkflowKey } from "../../../helpers/generateWorkflowKey.js";
import { createEmptyWorkflowData } from "../../../helpers/createEmptyWorkflowData.js";

const ROUTE_PATH = "/jobs/workflows/create" as const;

const schema = workflowStorage.schema.omit({
  lastRunAt: true,
  oldestRunAt: true,
  totalWorkflowRuns: true,
  lastUpdatedAt: true,
});

export function mountCreateNewWorkflowRoute<
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
      const { workflowId, workflowName, workflowParams } =
        await (c.req.json() as Promise<z.infer<typeof schema>>);

      const workflowKey = generateWorkflowKey({
        workflowName,
        workflowParams: {
          owner: workflowParams.owner,
          repo: workflowParams.repo,
          branchName: workflowParams.branchName,
        },
      });

      await workflowStorage.set(
        workflowKey,
        createEmptyWorkflowData({
          workflowId,
          workflowName,
          workflowOwner: workflowParams.owner,
          workflowRepository: workflowParams.repo,
        })
      );

      const data = await workflowStorage.get(workflowKey);
      if (!data) {
        throw new HTTPException(404, {
          message: "Workflow not found",
          res: new Response("Not Found", {
            status: 404,
            statusText: "Not Found",
          }),
        });
      }

      return c.json(data);
    }
  );
}
