/**
 * Logger utility for development-only logging
 * Use this instead of console.log for non-critical logs
 */

type LogArgs = unknown[];

export const logger = {
  log: (...args: LogArgs) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(...args)
    }
  },
  debug: (...args: LogArgs) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(...args)
    }
  },
  info: (...args: LogArgs) => {
    if (process.env.NODE_ENV === 'development') {
      console.info(...args)
    }
  },
  // These are kept in production for debugging critical issues
  error: console.error,
  warn: console.warn,
}
