import Transport from "winston-transport";
import { createLogger, format, transports, transport } from "winston";
import { config } from "../../config/config.js";
import {
  isTelemetryEnabled,
  telemetryLogger,
} from "../Telemetry/initTelemetry.js";
import dayjs from "dayjs";
import type { LoggerOptions, Logger, LogEntry } from "winston";
import { context } from "@opentelemetry/api";
import logsAPI from "@opentelemetry/api-logs";

const SeverityMap = {
  fatal: {
    severityText: "FATAL",
    severityNumber: logsAPI.SeverityNumber.FATAL,
  },
  error: {
    severityText: "ERROR",
    severityNumber: logsAPI.SeverityNumber.ERROR,
  },
  warn: {
    severityText: "WARN",
    severityNumber: logsAPI.SeverityNumber.WARN,
  },
  info: {
    severityText: "INFO",
    severityNumber: logsAPI.SeverityNumber.INFO,
  },
  debug: {
    severityText: "DEBUG",
    severityNumber: logsAPI.SeverityNumber.DEBUG,
  },
  trace: {
    severityText: "TRACE",
    severityNumber: logsAPI.SeverityNumber.TRACE,
  },
} as const;
function isKnownLevel(level: string): level is keyof typeof SeverityMap {
  return level in SeverityMap;
}

class CustomTelemetryTransport extends Transport {
  static parseAttributes(message: string) {
    const [, match] = message.match(/\[(.*?)\]/) ?? [];
    if (!match) {
      return null;
    }
    if (match.includes(":")) {
      const [name, id] = match.split(":");

      return {
        name,
        id,
      };
    }

    return {
      name: match,
    };
  }
  constructor(opts: Transport.TransportStreamOptions) {
    super(opts);
  }

  log(info: LogEntry, callback: () => void | Promise<void>) {
    setImmediate(() => {
      this.emit("logged", info);
    });

    const { level, message, timestamp: rawTimestamp, ...rest } = info;

    if (!isKnownLevel(level)) {
      console.warn("Unknown level", level);
      return;
    }

    let timestamp = dayjs(rawTimestamp);
    if (!timestamp.isValid()) {
      console.warn("Invalid timestamp", rawTimestamp);
      timestamp = dayjs();
    }

    telemetryLogger.emit({
      severityNumber: SeverityMap[level].severityNumber,
      severityText: SeverityMap[level].severityText,
      timestamp: timestamp.toDate(),
      body: typeof message === "string" ? message : JSON.stringify(message),
      context: context.active(),
      attributes: {
        ...rest,
        ...(CustomTelemetryTransport.parseAttributes(message) ?? {}),
      },
    });

    callback();
  }
}

function createLoggerInstance(): Logger {
  const sharedLoggerConfig: Partial<LoggerOptions> = {
    level:
      config.ENV.DEBUG || config.ENV.NODE_ENV === "development"
        ? "debug"
        : "info",
  };

  return createLogger({
    ...sharedLoggerConfig,
    format: format.combine(format.timestamp({}), format.json({})),
    transports: [
      // isTelemetryEnabled?
      new CustomTelemetryTransport({
        ...sharedLoggerConfig,
      }),
      // : new transports.Console()
      new transports.Console({
        ...sharedLoggerConfig,
        format: format.combine(
          format.colorize(),
          format.printf((info) => {
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
      }),
    ],
  });
}

export default createLoggerInstance();
