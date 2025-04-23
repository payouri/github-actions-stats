import logger from "../lib/Logger/logger.js";
import { beforeListen } from "./beforeListen.js";
import { globalServerAbortController } from "./globalServerAbortController.js";
import { createServer } from "./index.js";
import { processWorkflowJobQueue } from "./queue.js";

async function main() {
  await beforeListen();
  logger.info("Starting server...");
  const server = await createServer();

  server.on("error", (err) => {
    logger.error("Server error", err);
  });

  process.on("SIGTERM", async () => {
    globalServerAbortController.abort("SIGTERM");
    await Promise.all([processWorkflowJobQueue.close()]);
    if (!server.listening) {
      logger.debug("Server wasn't listening");
      process.exit(0);
    }
    logger.debug("Closing server");
    server.close((error) => {
      if (error) {
        logger.error("Error closing server", error);
        process.exit(1);
      }
      logger.info("Server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    if (!server.listening) {
      logger.debug("Server wasn't listening");
      process.exit(0);
    }
    logger.debug("Closing server");
    server.close((error) => {
      if (error) {
        logger.error("Error closing server", error);
        process.exit(1);
      }
      logger.info("Server closed");
      process.exit(0);
    });
  });
  process.on("uncaughtException", (err) => {
    console.error(err);
    logger.error("Uncaught exception", err);
    process.exit(1);
  });
  process.on("unhandledRejection", (err) => {
    console.error(err);
    logger.error("Unhandled rejection", err);
    process.exit(1);
  });
}

await main();
