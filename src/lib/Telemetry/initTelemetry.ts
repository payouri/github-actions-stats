import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-proto";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-proto";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import {
  LoggerProvider,
  BatchLogRecordProcessor,
  ConsoleLogRecordExporter,
} from "@opentelemetry/sdk-logs";
import { NodeSDK } from "@opentelemetry/sdk-node";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { config } from "../../config/config.js";
import { join } from "node:path";
import logger from "../Logger/logger.js";

const collectorOptions = {
  url: config.OTEL.endpoint ? join(config.OTEL.endpoint, "v1/logs") : undefined, // url is optional and can be omitted - default is http://localhost:4318/v1/logs
  headers: {}, // an optional object containing custom headers to be sent with each request
  concurrencyLimit: 1, // an optional limit on pending requests
};
const logExporter = new OTLPLogExporter(collectorOptions);
// const logConsoleExporter = new ConsoleLogRecordExporter();
const loggerProvider = new LoggerProvider({
  processors: [
    // new BatchLogRecordProcessor(logConsoleExporter),
    new BatchLogRecordProcessor(logExporter),
  ],
});

export const isTelemetryEnabled =
  !config.OTEL.disabled && config.ENV.NODE_ENV === "production";

export const telemetryLogger = loggerProvider.getLogger("telemetry");

const sdk = new NodeSDK({
  autoDetectResources: true,
  // sampler: {
  //   shouldSample() {
  //     return {
  //       decision: 2,
  //     };
  //   },
  // },
  logRecordProcessors: [
    new BatchLogRecordProcessor(logExporter),
    // new BatchLogRecordProcessor(logConsoleExporter),
  ],
  traceExporter: new OTLPTraceExporter({
    url: config.OTEL.endpoint
      ? join(config.OTEL.endpoint, "v1/traces")
      : undefined,
  }),
  metricReader: new PeriodicExportingMetricReader({
    exportIntervalMillis: 1000,
    exporter: new OTLPMetricExporter({
      concurrencyLimit: 1,
      url: config.OTEL.endpoint
        ? join(config.OTEL.endpoint, "v1/metrics")
        : undefined,
    }),
  }),
  instrumentations: getNodeAutoInstrumentations(),
  serviceName: config.OTEL.serviceName,
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: config.OTEL.serviceName,
    [ATTR_SERVICE_VERSION]: config.OTEL.serviceVersion,
  }),
});

export function initTelemetry() {
  if (config.OTEL.disabled) {
    logger.warn("Telemetry is disabled");
    return;
  }
  if (config.ENV.NODE_ENV !== "production") {
    logger.warn("Telemetry is only enabled in development mode");
    return;
  }
  if (!config.OTEL.endpoint) {
    logger.warn("Telemetry is enabled but no endpoint is configured");
    return;
  }

  sdk.start();
}

export function closeTelemetry() {
  return sdk.shutdown();
}
