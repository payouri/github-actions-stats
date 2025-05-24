import "colors";
import type { Hono } from "hono";
import type { Logger } from "winston";
import defaultLogger from "../../lib/Logger/logger.js";
import type { HonoRequestContext } from "../types.js";
import type { ZodSchema } from "zod";
import { validator } from "hono/validator";
import { HTTPException } from "hono/http-exception";
import { formatMs } from "../../helpers/format/formatMs.js";

const DefaultMethodColor = "grey";
const MethodColorMap = {
  GET: "blue",
  POST: "green",
  PUT: "yellow",
  DELETE: "red",
  PATCH: "magenta",
} as const;

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
//     validator("json", (value) => {
//       const parsedBody = schema.safeParse(value);
//       if (!parsedBody.success) {
//         throw new HTTPException(400, {
//           message: "Validation Failed",
//           res: new Response("Bad Request", {
//             status: 400,
//             statusText: "Validation Failed",
//           }),
//         });
//       }

//       return parsedBody.data;
//     }),

export function validateJsonRequestBodyMiddleware<Schema extends ZodSchema>(
  path: string,
  schema: Schema
) {
  return (app: Hono<HonoRequestContext>) =>
    app.use(
      path,
      async (c, next) => {
        if (c.req.method === "POST" || c.req.method === "PUT") {
          if (c.req.header("content-type") !== "application/json") {
            throw new Error("Content-Type header is not application/json");
          }
        }
        next();
      },
      validator("json", (value) => {
        const parsedBody = schema.safeParse(value);
        if (!parsedBody.success) {
          throw new HTTPException(400, {
            message: "Validation Failed",
            res: new Response("Bad Request", {
              status: 400,
              statusText: "Validation Failed",
            }),
          });
        }

        return parsedBody.data;
      })
    );
}
