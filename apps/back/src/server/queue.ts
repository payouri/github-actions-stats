import { createProcessWorkflowJobQueue } from "../queues/index.js";
import { globalServerAbortController } from "./globalServerAbortController.js";

export const processWorkflowJobQueue = createProcessWorkflowJobQueue({
  abortSignal: globalServerAbortController.signal,
});
