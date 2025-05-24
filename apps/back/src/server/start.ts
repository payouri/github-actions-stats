import {
	closeTelemetry,
	initTelemetry,
} from "../lib/Telemetry/initTelemetry.js";
initTelemetry();

import type { ServerType } from "@hono/node-server";
import { formatMs } from "../helpers/format/formatMs.js";
import logger from "../lib/Logger/logger.js";
import { beforeListen } from "./beforeListen.js";
import { globalServerAbortController } from "./globalServerAbortController.js";
import { createServer } from "./index.js";
import { processWorkflowJobQueue } from "./queue.js";

const SIGNALS = ["SIGINT", "SIGTERM"] as const;

function handleSignal(params: {
	abortController: AbortController;
	server: ServerType;
}) {
	const { abortController, server } = params;

	// biome-ignore lint/complexity/noForEach: <explanation>
	SIGNALS.forEach((signal) => {
		process.on(signal, async () => {
			logger.warn(`${signal} signal received`);
			if (abortController.signal.aborted) return;

			const start = performance.now();
			logger.info("Closing server...");
			await Promise.all([processWorkflowJobQueue.close()]);
			await closeTelemetry();

			abortController.abort(`${signal} signal received`);
			if (!server.listening) {
				logger.debug(
					`Server wasn't listening ${formatMs(performance.now() - start)}`,
				);
				process.exit(0);
			}
			server.close((error) => {
				if (error) {
					logger.error("Error closing server", error);
					process.exit(1);
				}
				logger.info(`Server closed in ${formatMs(performance.now() - start)}`);
				process.exit(0);
			});
		});
		return;
	});
}

async function main() {
	logger.info("Starting server...");
	const start = performance.now();
	await beforeListen();
	const server = await createServer();
	logger.info(`Server started in ${formatMs(performance.now() - start)}`);

	server.on("error", (err) => {
		logger.error("Server error", err);
	});

	handleSignal({
		abortController: globalServerAbortController,
		server,
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
