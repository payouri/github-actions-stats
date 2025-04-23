import { createLogger, transports } from "winston";

export const toolLogger = createLogger({
  transports: [
    new transports.Console({
      level: "debug",
      format: {
        options: {},
        transform(info, opts) {
          console.log(info, opts);
          return info;
        },
      },
    }),
  ],
});

export default toolLogger;
