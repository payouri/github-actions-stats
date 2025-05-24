import packageJson from "../../package.json" with { type: "json" }; 

const { version: packageVersion, name: packageName } = packageJson;

export const OPEN_TELEMETRY_CONFIG = {
  disabled: process.env.OPEN_TELEMETRY_DISABLED === "true",
  endpoint: process.env.OPEN_TELEMETRY_ENDPOINT,
  serviceName: process.env.OPEN_TELEMETRY_SERVICE_NAME || packageName,
  serviceVersion: process.env.OPEN_TELEMETRY_SERVICE_VERSION || packageVersion,
};
