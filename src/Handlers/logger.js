import winston from "winston";
import { redactSecrets } from "../Utils/secrets.js";

const scrubFormat = winston.format((info) => {
  info.message = redactSecrets(info.message)?.replace?.(/[\r\n]/g, "\\n") ?? info.message;
  if (info.stack) info.stack = redactSecrets(info.stack);
  return info;
});

export default {
  async execute(client) {
    client.logger = winston.createLogger({
      level: "info",
      format: winston.format.combine(
        scrubFormat(),
        winston.format.timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
        winston.format.printf((info) => `[${info.timestamp}] [${client.user?.tag ?? client.role ?? "boot"}] ${info.level}: ${info.message}`)
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        new winston.transports.File({ filename: `logs/${client.role}-combined.log`, maxsize: 5242880, maxFiles: 5 }),
        new winston.transports.File({ filename: `logs/${client.role}-commands.log`, level: "info", maxsize: 5242880, maxFiles: 3 }),
      ],
    });

  },
};
