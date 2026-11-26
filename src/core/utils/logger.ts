export const logger = {
  info(message: string, ...args: unknown[]): void {
    if (typeof console !== 'undefined') console.info(`[休闲王都] ${message}`, ...args);
  },
  warn(message: string, ...args: unknown[]): void {
    if (typeof console !== 'undefined') console.warn(`[休闲王都] ${message}`, ...args);
  },
  error(message: string, ...args: unknown[]): void {
    if (typeof console !== 'undefined') console.error(`[休闲王都] ${message}`, ...args);
  },
};
