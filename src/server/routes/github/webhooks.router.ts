import type { Context, Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { BlankInput } from "hono/types";
import { GITHUB_CONFIG } from "../../../config/github.js";
import logger from "../../../lib/Logger/logger.js";
import type { MethodResult } from "../../../types/MethodResult.js";
import { components } from "@octokit/openapi-webhooks-types";
import { mountGithubWebhookValidationMiddleware } from "../../middlewares/githubWebhookValidationMiddleware.js";
import type { HonoRequestContext } from "../../types.js";
import { generateWorkflowKey } from "../../../helpers/generateWorkflowKey.js";
import { DB } from "../../../entities/db.js";
import { getFormattedWorkflowRun } from "../../../helpers/getFormattedWorkflowRun.js";

const SUPPORTED_EVENTS = ["workflow_run"] as const;
type SupportedEvent = (typeof SUPPORTED_EVENTS)[number];
function isSupportedEvent(event: string): event is SupportedEvent {
  return SUPPORTED_EVENTS.includes(event as SupportedEvent);
}

type WorkflowRunEvent =
  | components["schemas"]["webhook-workflow-run-in-progress"]
  | components["schemas"]["webhook-workflow-run-completed"]
  | components["schemas"]["webhook-workflow-run-requested"];
async function handleWorkflowRunEvent<Env extends HonoRequestContext>(
  c: Context<Env, string, BlankInput>
): Promise<
  MethodResult<
    {
      status: "not_handled" | "handled";
      reason?: string;
    },
    | "failed_to_process_event"
    | "workflow_run_name_missing"
    | "workflow_missing"
    | "failed_to_add_workflow_run"
  >
> {
  const data: WorkflowRunEvent = await c.req.json();

  const { workflow_run, repository, workflow } = data;
  if (!workflow) {
    logger.warn("Workflow data is missing", {
      workflowId: workflow_run.id,
      repository: repository.full_name,
    });
    return {
      hasFailed: true,
      error: {
        code: "workflow_missing",
        data,
        message: "Workflow is missing",
        error: new Error("Workflow is missing"),
      },
    };
  }
  if (!workflow.name) {
    logger.warn("Workflow run name is missing", {
      workflowId: workflow.id,
      repository: repository.full_name,
    });
    return {
      hasFailed: true,
      error: {
        code: "workflow_run_name_missing",
        data,
        message: "Workflow run name is missing",
        error: new Error("Workflow run name is missing"),
      },
    };
  }

  const workflowKey = generateWorkflowKey({
    workflowName: workflow.name,
    workflowParams: {
      owner: repository.owner.login,
      repo: repository.name,
    },
  });
  if (!(await DB.queries.isExistingWorkflow({ workflowKey }))) {
    return {
      hasFailed: false,
      data: {
        status: "not_handled",
        reason: "parent_workflow_not_found",
      },
    };
  }
  if (data.action === "completed") {
    const addResult = await DB.mutations.addWorkflowRun({
      workflowKey,
      workflowRun: {
        ...getFormattedWorkflowRun(workflow_run),
        workflowId: workflow_run.workflow_id,
        workflowName: workflow.name,
        repositoryName: repository.name,
        repositoryOwner: repository.owner.login,
      },
    });

    if (addResult.hasFailed) {
      return {
        hasFailed: true,
        error: {
          code: "failed_to_add_workflow_run",
          message: addResult.error.message,
          error: addResult.error.error,
          data: addResult.error.data,
        },
      };
    }

    return {
      hasFailed: false,
      data: {
        status: "handled",
      },
    };
  }

  return {
    hasFailed: false,
    data: {
      status: "not_handled",
    },
  };
}

const HandlersMap: {
  [key in SupportedEvent]: <Env extends HonoRequestContext>(
    c: Context<Env, string, BlankInput>
  ) => Promise<
    MethodResult<
      {
        status: "not_handled" | "handled";
      },
      string
    >
  >;
} = {
  workflow_run: handleWorkflowRunEvent,
};

export function mountGithubWebhooksRoutes<
  Env extends HonoRequestContext
>(dependencies: { app: Hono<Env> }) {
  const { app } = dependencies;

  if (!GITHUB_CONFIG.webhookSecret) {
    logger.warn("[env] GITHUB_WEBHOOK_SECRET is not set");
  } else {
    mountGithubWebhookValidationMiddleware({
      app,
      githubWebhookSecret: GITHUB_CONFIG.webhookSecret,
    });
  }
  app.post("/webhooks", async (c) => {
    const contentType = c.req.header("content-type");
    const githubEvent = c.req.header("x-github-event");

    if (!githubEvent) {
      throw new HTTPException(400, {
        message: "X-GitHub-Event header is missing",
        res: new Response("Bad Request", {
          status: 400,
          statusText: "X-GitHub-Event header is missing",
        }),
      });
    }
    if (contentType !== "application/json") {
      throw new HTTPException(400, {
        message: "Content-Type header is not application/json",
        res: new Response("Bad Request", {
          status: 400,
          statusText: "Content-Type header is not application/json",
        }),
      });
    }
    if (!isSupportedEvent(githubEvent)) {
      return c.json({ status: "not_handled" });
    }

    const result = await HandlersMap[githubEvent](c);
    if (result.hasFailed) {
      logger.error("Failed to process event", result.error);
      throw new HTTPException(500, {
        message: "Internal Server Error",
        res: new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      });
    }

    return c.json(result.data);
  });

  return {};
}
