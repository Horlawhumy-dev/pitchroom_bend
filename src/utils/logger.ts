// utils/logger.ts

type LogLevel = "info" | "warn" | "error" | "debug";

class Logger {
  private static formatMessage(
    level: LogLevel,
    message: string,
    meta?: any,
  ): string {
    const timestamp = new Date().toISOString();
    let log = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    if (meta) {
      log += ` | Meta: ${JSON.stringify(meta)}`;
    }
    return log;
  }

  static info(message: string, meta?: any): void {
    console.info(this.formatMessage("info", message, meta));
  }

  static warn(message: string, meta?: any): void {
    console.warn(this.formatMessage("warn", message, meta));
  }

  static error(message: string, meta?: any): void {
    console.error(this.formatMessage("error", message, meta));
  }

  static debug(message: string, meta?: any): void {
    if (process.env.ENV === "dev") {
      console.debug(this.formatMessage("debug", message, meta));
    }
  }
}

export default Logger;
