import { runCompletionStatusSchema } from "@github-actions-stats/common-entity";
import type { Hono } from "hono";
import type { BlankEnv } from "hono/types";
import { DB } from "../../../entities/db.js";

export function mountListWorkflowRunsPaginatedRoute<
	Env extends BlankEnv,
>(dependencies: { app: Hono<Env> }) {
	const { app } = dependencies;

	app.get("/runs/:workflowKey/:status?", async (c) => {
		const { workflowKey, status } = c.req.param();

		const parsedStatus =
			typeof status === "string"
				? runCompletionStatusSchema.parse(status)
				: status;

		const runsData = await DB.queries.getRuns({
			workflowKey,
			status: parsedStatus,
		});

		return c.json(runsData);
	});
}
