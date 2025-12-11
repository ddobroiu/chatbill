const logger = require('../config/logger');

/**
 * Request logging middleware
 * Logs all HTTP requests with timing information
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original end function
  const originalEnd = res.end;

  // Override end function to log after response is sent
  res.end = function (...args) {
    // Calculate response time
    const responseTime = Date.now() - startTime;

    // Log the request
    logger.logRequest(req, res.statusCode, responseTime);

    // Call original end function
    originalEnd.apply(res, args);
  };

  next();
};

module.exports = requestLogger;
