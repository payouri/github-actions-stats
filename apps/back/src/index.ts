import concurrently from "concurrently";
import packageJson from "../project.json" with { type: "json" };
import logger from "./lib/Logger/logger.js";

const { targets } = packageJson;

const result = concurrently(
	process.env.NODE_ENV === "production"
		? [
				{
					command: targets["start:server"].options.command,
					prefixColor: "yellow",
					name: "server",
				},
				{
					command: targets["start:workers"].options.command,
					prefixColor: "green",
					name: "worker",
				},
			]
		: [
				{
					command: targets["dev:server"].options.command,
					prefixColor: "yellow",
					name: "server",
				},
				{
					command: targets["dev:workers"].options.command,
					prefixColor: "green",
					name: "worker",
				},
			],
	{
		killOthers: process.env.NODE_ENV === "production" ? "failure" : [],
		killSignal: "SIGTERM",
		timings: true,
	},
);

try {
	await result.result;
} catch (error) {
	logger.error("Failed to start server", error);
	process.exit(1);
}
