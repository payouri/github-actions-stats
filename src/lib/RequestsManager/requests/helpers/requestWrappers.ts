import { performance } from "perf_hooks";
import logger from "../../../Logger/logger.js";

export function functionTimerify<Fn extends (...args: any[]) => Promise<any>>(
  fn: Fn
): Fn {
  const wrappedFunction = async (
    ...args: Parameters<Fn>
  ): Promise<Awaited<ReturnType<Fn>>> => {
    const start = performance.now();
    const result = await fn(...args);
    const end = performance.now();
    logger.debug(`Request ${fn.name} took ${end - start}ms`);
    return result;
  };

  return wrappedFunction as Fn;
}
