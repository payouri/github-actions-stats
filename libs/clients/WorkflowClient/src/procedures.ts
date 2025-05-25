import { z } from "zod";
import type { TRPCBuilder } from "./types.js";

const getWorkflowsProcedureInputSchema = z.object({
	start: z.number(),
	count: z.number(),
});

async function buildGetWorkflowsProcedureProcedure();

export function BuildWorkflowsProcedures(dependencies: {
	trpcInstance: ReturnType<TRPCBuilder["create"]>;
}) {}
