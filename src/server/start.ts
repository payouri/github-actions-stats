import logger from "../lib/Logger/logger.js";
import { createServer } from "./index.js";

async function main() {
  logger.info("Starting server...");
  const server = await createServer();

  server.on("error", (err) => {
    logger.error("Server error", err);
  });

  process.on("SIGTERM", () => {
    server.close((error) => {
      if (error) {
        logger.error("Error closing server", error);
        // logger.once("drain", () => {
        // });
        process.exit(1);
      }
      // logger.once("drain", () => {
      // });
      logger.info("Server closed");
      process.exit(0);
    });
  });
  process.on("SIGINT", () => {
    server.close((error) => {
      if (error) {
        logger.error("Error closing server", error);
        // logger.once("drain", () => {
        // });
        process.exit(1);
      }
      // logger.once("drain", () => {
      // });
      logger.info("Server closed");
      process.exit(0);
    });
  });
  // process.on("beforeExit", async () => {
  //   // process.exit(0);
  //   console.log("beforeExit");
  // });
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
