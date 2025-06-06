const logger = {
  info: (message) => console.log(`[INFO] ${message}`),
  warn: (message) => console.warn(`[WARN] ${message}`),
  error: (message) => console.error(`[ERROR] ${message}`),
  debug: (message) => console.debug(`[DEBUG] ${message}`)
};

const errorLogger = (error) => {
  console.error('[ERROR]', error);
};

module.exports = { logger, errorLogger }; 