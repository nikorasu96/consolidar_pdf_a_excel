/**
 * Módulo logger para centralizar los logs de depuración.
 * En entorno servidor se podría configurar winston u otro logger,
 * pero por ahora utiliza console para ambos entornos.
 */
const isServer = typeof window === "undefined";

const logger = {
  debug: (...args: any[]) => {
    if (isServer) {
      console.debug(...args);
    } else {
      console.debug(...args);
    }
  },
  info: (...args: any[]) => {
    if (isServer) {
      console.info(...args);
    } else {
      console.info(...args);
    }
  },
  warn: (...args: any[]) => {
    if (isServer) {
      console.warn(...args);
    } else {
      console.warn(...args);
    }
  },
  error: (...args: any[]) => {
    if (isServer) {
      console.error(...args);
    } else {
      console.error(...args);
    }
  },
};

export default logger;
