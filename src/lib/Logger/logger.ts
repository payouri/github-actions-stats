import { createLogger, format, transports } from "winston";
import { config } from "../../config/config.js";
import {
  isTelemetryEnabled,
  telemetryLogger,
} from "../Telemetry/initTelemetry.js";
import dayjs from "dayjs";

function createLoggerInstance() {
  return createLogger({
    level:
      config.ENV.DEBUG || config.ENV.NODE_ENV === "development"
        ? "debug"
        : "info",
    format: format.combine(
      format.timestamp({}),
      format.json({}),
      format.colorize(),
      format.printf((info) => {
        console.log(info);
        if (isTelemetryEnabled) {
          const data: { level: string; message: any; timestamp: string } = info[
            Symbol.for("message")
          ] as any;
          telemetryLogger.emit({
            severityText: data.level,
            timestamp: dayjs(
              (data.timestamp && typeof data.timestamp === "number") ||
                typeof data.timestamp === "string"
                ? data.timestamp
                : data instanceof Date
                ? data.getTime()
                : Date.now()
            ).toDate(),
            attributes:
              typeof data.message === "object" && data.message !== null
                ? (data.message as Record<string, any>)
                : {
                    message: info.message,
                  },
          });
        }

        return `${dayjs(info.timestamp as string).format(
          "YYYY-MM-DD HH:mm:ss"
        )} ${info.level}: ${
          typeof info.message === "string" ||
          typeof info.message === "number" ||
          typeof info.message === "boolean" ||
          info.message === null ||
          info.message === undefined
            ? info.message
            : JSON.stringify(info.message)
        }`;
      })
    ),
    transports: [new transports.Console()],
  });
}

export default createLoggerInstance();
