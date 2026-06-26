type Level = "debug" | "info" | "warn" | "error";

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return { name: value.name, message: value.message, stack: value.stack };
  }
  return value;
}

function stamp(level: Level, scope: string) {
  const t = new Date().toISOString().slice(11, 23);
  return `[${t}] [${level.toUpperCase()}] [${scope}]`;
}

export function createLogger(scope: string) {
  return {
    debug: (...args: unknown[]) => {
      if (__DEV__) console.log(stamp("debug", scope), ...args.map(serialize));
    },
    info: (...args: unknown[]) => {
      console.log(stamp("info", scope), ...args.map(serialize));
    },
    warn: (...args: unknown[]) => {
      console.warn(stamp("warn", scope), ...args.map(serialize));
    },
    error: (...args: unknown[]) => {
      console.error(stamp("error", scope), ...args.map(serialize));
    }
  };
}

export const log = createLogger("app");
