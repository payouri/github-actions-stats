import { createProcessWorfklowJobQueue } from "../queues/index.js";
import { globalServerAbortController } from "./globalServerAbortController.js";

export const processWorkflowJobQueue = createProcessWorfklowJobQueue({
  abortSignal: globalServerAbortController.signal,
});
