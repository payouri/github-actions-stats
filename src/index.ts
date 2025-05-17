import concurrently from "concurrently";
import packageJson from "../package.json" with { type: "json" };

const { scripts } = packageJson;

concurrently(
  process.env.NODE_ENV === "production"
    ? [
      {
        command: scripts["start:server"],
        prefixColor: "yellow",
        name: "server",
      },
      {
        command: scripts["start:workers"],
        prefixColor: "green",
        name: "worker",
      },
    ]
    : [
      {
        command: scripts["dev:server"],
        prefixColor: "yellow",
        name: "server",
      },
      {
        command: scripts["dev:workers"],
        prefixColor: "green",
        name: "worker",
      },
    ]
  , {
    killOthers: [],
    killSignal: "SIGTERM",
  });
