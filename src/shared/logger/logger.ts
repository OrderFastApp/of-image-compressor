import cluster from "node:cluster";
import process from "node:process";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MAX_STRING_LENGTH = 1024;
const SERVICE_NAME = "of-image-compressor";

function getConfiguredLogLevel(): LogLevel {
  const level = process.env.LOG_LEVEL;
  if (level === "debug" || level === "info" || level === "warn" || level === "error") {
    return level;
  }
  return "debug";
}

function getBaseContext(): LogContext {
  return {
    service: SERVICE_NAME,
    pid: process.pid,
    ...(cluster.isWorker && cluster.worker ? { workerId: cluster.worker.id } : {}),
  };
}

function isBinaryLike(value: unknown): boolean {
  return (
    value instanceof Uint8Array ||
    value instanceof ArrayBuffer ||
    (typeof Buffer !== "undefined" && Buffer.isBuffer(value)) ||
    value instanceof File ||
    value instanceof Blob
  );
}

function sanitizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return "[MaxDepth]";
  }

  if (value === null || value === undefined) {
    return value;
  }

  if (isBinaryLike(value)) {
    if (value instanceof Uint8Array || (typeof Buffer !== "undefined" && Buffer.isBuffer(value))) {
      return `[Binary ${(value as Uint8Array).byteLength} bytes]`;
    }
    if (value instanceof ArrayBuffer) {
      return `[Binary ${value.byteLength} bytes]`;
    }
    if (value instanceof File) {
      return { type: "File", name: value.name, size: value.size, mimeType: value.type };
    }
    if (value instanceof Blob) {
      return { type: "Blob", size: value.size, mimeType: value.type };
    }
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: truncateString(value.message),
      stack: value.stack,
    };
  }

  if (typeof value === "string") {
    return truncateString(value);
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, nestedValue] of Object.entries(value)) {
      if (key === "fileBuffer" || key === "buffer") {
        if (isBinaryLike(nestedValue)) {
          result[key] = sanitizeValue(nestedValue, depth + 1);
          continue;
        }
      }
      result[key] = sanitizeValue(nestedValue, depth + 1);
    }
    return result;
  }

  return value;
}

function truncateString(value: string): string {
  if (value.length <= MAX_STRING_LENGTH) {
    return value;
  }
  return `${value.slice(0, MAX_STRING_LENGTH)}...[truncated]`;
}

function sanitizeContext(context?: LogContext): LogContext | undefined {
  if (!context) {
    return undefined;
  }
  return sanitizeValue(context) as LogContext;
}

export type Logger = {
  debug: (message: string, context?: LogContext) => void;
  info: (message: string, context?: LogContext) => void;
  warn: (message: string, context?: LogContext) => void;
  error: (message: string, context?: LogContext) => void;
  child: (context: LogContext) => Logger;
};

function createLogger(fixedContext: LogContext = {}): Logger {
  const minLevel = getConfiguredLogLevel();

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[minLevel];
  }

  function log(level: LogLevel, message: string, context?: LogContext): void {
    if (!shouldLog(level)) {
      return;
    }

    const sanitizedContext = sanitizeContext(context);
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...getBaseContext(),
      ...fixedContext,
      ...sanitizedContext,
    };

    const output = JSON.stringify(entry);

    switch (level) {
      case "error":
        console.error(output);
        break;
      case "warn":
        console.warn(output);
        break;
      case "debug":
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  return {
    debug: (message: string, context?: LogContext) => log("debug", message, context),
    info: (message: string, context?: LogContext) => log("info", message, context),
    warn: (message: string, context?: LogContext) => log("warn", message, context),
    error: (message: string, context?: LogContext) => log("error", message, context),
    child: (context: LogContext) => createLogger({ ...fixedContext, ...context }),
  };
}

export const logger = createLogger();
