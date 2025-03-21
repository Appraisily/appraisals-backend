const gcsLogger = require('./gcsLogger');

function createLogger(name) {
  return {
    info: (message, sessionId, data = {}) => {
      console.log(`[${name}] ${message}`);
      if (sessionId) {
        return gcsLogger.info(sessionId, message, data);
      }
    },
    error: (message, sessionId, error, data = {}) => {
      console.error(`[${name}] ${message}`, error);
      if (sessionId) {
        return gcsLogger.error(sessionId, message, { ...data, error: formatError(error) });
      }
    },
    warn: (message, sessionId, data = {}) => {
      console.warn(`[${name}] ${message}`);
      if (sessionId) {
        return gcsLogger.warn(sessionId, message, data);
      }
    },
    debug: (message, sessionId, data = {}) => {
      console.debug(`[${name}] ${message}`);
      if (sessionId) {
        return gcsLogger.debug(sessionId, message, data);
      }
    }
  };
}

function formatError(error) {
  if (!error) return null;
  
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }
  
  return error;
}

module.exports = { createLogger }; 