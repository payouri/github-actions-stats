import concurrently from "concurrently";
import packageJson from "../package.json" with { type: "json" };

const { scripts } = packageJson;

concurrently(
  process.env.NODE_ENV === "production"
    ? []
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
