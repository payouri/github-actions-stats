import concurrently from "concurrently";

concurrently(
  process.env.NODE_ENV === "production"
    ? []
    : [
        {
          command: "yarn run dev:server",
          prefixColor: "yellow",
          name: "server",
        },
        {
          command: "yarn run dev:workers",
          prefixColor: "green",
          name: "worker",
        },
      ]
);
