import type { z } from "zod";
import type { pendingJobSchema } from "./schemas/pendingJob.schema.js";

export type PendingJob = z.infer<typeof pendingJobSchema>;
