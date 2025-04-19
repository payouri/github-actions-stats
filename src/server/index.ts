import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { buildRoutes } from "./routes/index.js";
import { SERVER_CONFIG } from "../config/server.js";
import logger from "../lib/Logger/logger.js";

export async function createServer() {
  const app = new Hono<{
    Variables: {
      startTime: number;
    };
  }>({});

  app.use(async (c, next) => {
    const startTime = performance.now();
    c.set("startTime", startTime);
    await next();
    logger.debug(
      `Request ${c.req.method} ${c.req.path} took ${(
        performance.now() - startTime
      ).toFixed(2)}ms ended with status ${c.res.status}`
    );
    c.res.headers.set("X-Response-Time", `${performance.now() - startTime}ms`);
  });
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
