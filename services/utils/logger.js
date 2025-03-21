const s3Logger = require('./s3Logger');

function createLogger(name) {
  return {
    info: (message, sessionId, data = {}) => {
      console.log(`[${name}] ${message}`);
      if (sessionId) {
        return s3Logger.info(sessionId, message, data);
      }
    },
    error: (message, sessionId, error, data = {}) => {
      console.error(`[${name}] ${message}`, error);
      if (sessionId) {
        return s3Logger.error(sessionId, message, { ...data, error: formatError(error) });
      }
    },
    warn: (message, sessionId, data = {}) => {
      console.warn(`[${name}] ${message}`);
      if (sessionId) {
        return s3Logger.warn(sessionId, message, data);
      }
    },
    debug: (message, sessionId, data = {}) => {
      console.debug(`[${name}] ${message}`);
      if (sessionId) {
        return s3Logger.debug(sessionId, message, data);
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