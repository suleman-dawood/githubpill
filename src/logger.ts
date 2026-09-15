export const LOG_LEVELS = ["silent", "error", "warn", "info", "debug"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

const SEVERITY: Record<LogLevel, number> = {
  silent: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

export interface Logger {
  readonly level: LogLevel;
  error(message: string): void;
  warn(message: string): void;
  info(message: string): void;
  debug(message: string): void;
}

/**
 * Minimal leveled logger. Diagnostics go to stderr so stdout stays reserved for
 * the verdict and machine-readable output. The pipeline does not log directly;
 * it emits progress events and the CLI decides how to render them.
 */
export function createLogger(
  level: LogLevel,
  stream: NodeJS.WritableStream = process.stderr,
): Logger {
  const write = (severity: LogLevel, message: string): void => {
    if (level === "silent" || SEVERITY[severity] > SEVERITY[level]) return;
    stream.write(`${message}\n`);
  };

  return {
    level,
    error: (message) => write("error", message),
    warn: (message) => write("warn", message),
    info: (message) => write("info", message),
    debug: (message) => write("debug", message),
  };
}

export function isLogLevel(value: string): value is LogLevel {
  return (LOG_LEVELS as readonly string[]).includes(value);
}
