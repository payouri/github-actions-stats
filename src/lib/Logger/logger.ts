import { createLogger, format, transports } from "winston";

function createLoggerInstance() {
  return createLogger({
    level: "debug",
    format: format.combine(
      format.timestamp({
        format: "YYYY-MM-DD HH:mm:ss",
      }),
      format.json({}),
      format.colorize(),
      format.printf(
        (info) =>
          `${info.timestamp} ${info.level}: ${
            typeof info.message === "string" ||
            typeof info.message === "number" ||
            typeof info.message === "boolean" ||
            info.message === null ||
            info.message === undefined
              ? info.message
              : JSON.stringify(info.message)
          }`
      )
    ),
    transports: [new transports.Console()],
  });
}

export default createLoggerInstance();
