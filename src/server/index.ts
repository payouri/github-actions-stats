import { serve } from "@hono/node-server";
import { trace } from "@opentelemetry/api";
import { otel } from "@hono/otel";
import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { SERVER_CONFIG } from "../config/server.js";
import logger from "../lib/Logger/logger.js";
import { requestTimeMiddleware } from "./middlewares/index.js";
import { buildRoutes } from "./routes/index.js";
import type { HonoRequestContext } from "./types.js";

export async function createServer() {
  const app = new Hono<HonoRequestContext>({});
  app.onError((err) => {
    if (err instanceof HTTPException) {
      const response = err.getResponse();

      return new Response(
        JSON.stringify({
          message: err.message,
        }),
        {
          status: response.status,
        }
      );
    }

    logger.error("Unhandled error", err);
    return new Response("Internal Server Error", {
      status: 500,
      statusText: "Internal Server Error",
    });
  });

  app.use(
    "*",
    otel({
      augmentSpan: false,
      tracerProvider: trace.getTracerProvider(),
    })
  );
  requestTimeMiddleware({ logger })(app);
  buildRoutes({ app });

  return serve(
    {
      ...app,
      port: SERVER_CONFIG.port,
    },
    (serverInfo) => {
      logger.info(
        `Server is running on port ${serverInfo.address}:${serverInfo.port}`
      );
    }
  );
}
