// src/utils/logger.ts
const isServer = typeof window === "undefined";

const logger = {
  debug: (...args: any[]) => {
    if (process.env.NODE_ENV === "development") {
      if (isServer) {
        console.debug("[Server DEBUG]:", ...args);
      } else {
        console.debug("[Client DEBUG]:", ...args);
      }
    }
  },
  info: (...args: any[]) => {
    if (isServer) {
      console.info("[Server INFO]:", ...args);
    } else {
      console.info("[Client INFO]:", ...args);
    }
  },
  warn: (...args: any[]) => {
    if (isServer) {
      console.warn("[Server WARN]:", ...args);
    } else {
      console.warn("[Client WARN]:", ...args);
    }
  },
  error: (...args: any[]) => {
    if (isServer) {
      console.error("[Server ERROR]:", ...args);
    } else {
      console.error("[Client ERROR]:", ...args);
    }
  },
};

export default logger;
