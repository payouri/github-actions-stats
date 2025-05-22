import { z } from "zod";
import { DEFAULT_PENDING_JOB_GROUP } from "../constants.js";

export const pendingJobSchema = z.object({
  // jobId: z.string(),
  method: z.string(),
  data: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional(),
  maxRetries: z.number().nullable().optional(),
  group: z.string().default(DEFAULT_PENDING_JOB_GROUP),
});
