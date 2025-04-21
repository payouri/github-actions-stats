import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { SERVER_CONFIG } from "../config/server.js";
import logger from "../lib/Logger/logger.js";
import { buildRoutes } from "./routes/index.js";
import type { HonoRequestContext } from "./types.js";
import { requestTimeMiddleware } from "./middlewares/index.js";

export async function createServer() {
  const app = new Hono<HonoRequestContext>({});

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
