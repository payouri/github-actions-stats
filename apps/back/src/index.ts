import concurrently from "concurrently";
import packageJson from "../project.json" with { type: "json" };

const { targets } = packageJson;

concurrently(
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
		killOthers: [],
		killSignal: "SIGTERM",
	},
);
