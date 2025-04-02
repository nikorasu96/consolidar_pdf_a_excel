// src/utils/logger.ts
const isServer = typeof window === "undefined";

const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      isServer ? console.debug("[Server DEBUG]:", ...args) : console.debug("[Client DEBUG]:", ...args);
    }
  },
  info: (...args: any[]) => {
    isServer ? console.info("[Server INFO]:", ...args) : console.info("[Client INFO]:", ...args);
  },
  warn: (...args: any[]) => {
    isServer ? console.warn("[Server WARN]:", ...args) : console.warn("[Client WARN]:", ...args);
  },
  error: (...args: any[]) => {
    isServer ? console.error("[Server ERROR]:", ...args) : console.error("[Client ERROR]:", ...args);
  },
};

export default logger;
