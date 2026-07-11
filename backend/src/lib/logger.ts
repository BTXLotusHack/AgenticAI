/**
 * Minimal structured JSON logger.
 *
 * Never log precise location, tokens, join codes or raw voice content by
 * default (CONTRIBUTING.md). Pass only coarse, non-sensitive fields.
 */
type Level = "debug" | "info" | "warn" | "error";

function emit(level: Level, message: string, fields?: Record<string, unknown>): void {
  const line = JSON.stringify({
    level,
    message,
    time: new Date().toISOString(),
    ...fields,
  });
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug: (message: string, fields?: Record<string, unknown>) => emit("debug", message, fields),
  info: (message: string, fields?: Record<string, unknown>) => emit("info", message, fields),
  warn: (message: string, fields?: Record<string, unknown>) => emit("warn", message, fields),
  error: (message: string, fields?: Record<string, unknown>) => emit("error", message, fields),
};
