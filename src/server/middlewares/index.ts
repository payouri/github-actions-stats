import "colors";
import type { Hono } from "hono";
import type { Logger } from "winston";
import defaultLogger from "../../lib/Logger/logger.js";
import type { HonoRequestContext } from "../types.js";

const DefaultMethodColor = "grey";
const MethodColorMap = {
  GET: "blue",
  POST: "green",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "magenta",
} as const;
const formatMs = (ms: number, fixed = 2) => {
  if (ms < 100) {
    return `${ms.toFixed(fixed)}ms`.green;
  }
  if (ms < 1000) {
    return `${ms.toFixed(fixed)}ms`.yellow;
  }
  if (ms < 10000) {
    return `${ms.toFixed(fixed)}ms`.magenta;
  }

  return `${ms.toFixed(fixed)}ms`.red;
};

export function requestTimeMiddleware(options?: {
  logger?: Logger;
  logLevel?: "debug" | "info" | "warn" | "error";
}) {
  const { logger = defaultLogger, logLevel = "debug" } = options ?? {};

  return (app: Hono<HonoRequestContext>) =>
    app.use(async (c, next) => {
      const startTime = performance.now();
      c.set("startTime", startTime);
      await next();

      const coloredStatus =
        c.res.status > 399
          ? c.res.status.toString().red
          : c.res.status.toString().green;

      const responseTimeMs = performance.now() - startTime;
      logger.log(
        logLevel,
        `[${
          c.req.method in MethodColorMap
            ? c.req.method[Reflect.get(MethodColorMap, c.req.method)]
            : c.req.method[DefaultMethodColor]
        }] path=${c.req.path} response=${formatMs(
          responseTimeMs
        )} status=${coloredStatus}`
      );
      c.res.headers.set("X-Response-Time", `${responseTimeMs.toFixed(2)}ms`);
    });
}
