import type { JobsMap } from "./methods/types.js";

export type WorkflowQueueJobData = {
  [Key in keyof JobsMap]: {
    data: JobsMap[Key]["jobData"];
  };
}[keyof JobsMap];
