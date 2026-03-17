// Production-safe logger — only logs in __DEV__ mode.
// In production builds, all log calls are no-ops.

export const logger = {
  log: (...args: unknown[]): void => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    if (__DEV__) console.error(...args);
  },
  info: (...args: unknown[]): void => {
    if (__DEV__) console.info(...args);
  },
};
