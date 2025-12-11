const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'warn';
};

// Custom format for console output
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`
  )
);

// Custom format for file output (JSON)
const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');

// Transport for all logs
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'chatbill-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d',
  format: fileFormat,
  level: 'debug',
});

// Transport for error logs
const errorLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d',
  format: fileFormat,
  level: 'error',
});

// Transport for HTTP requests
const httpLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d',
  format: fileFormat,
  level: 'http',
});

// Define transports
const transports = [
  // Console transport (for development)
  new winston.transports.Console({
    format: consoleFormat,
  }),
  // File transports (for production)
  allLogsTransport,
  errorLogsTransport,
  httpLogsTransport,
];

// Create logger instance
const logger = winston.createLogger({
  level: level(),
  levels,
  transports,
  exitOnError: false,
});

// Create a stream object for Morgan HTTP logger
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

// Helper methods for structured logging
logger.logRequest = (req, statusCode, responseTime) => {
  const message = `${req.method} ${req.originalUrl} ${statusCode} - ${responseTime}ms`;
  const meta = {
    method: req.method,
    url: req.originalUrl,
    statusCode,
    responseTime,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id || null,
  };

  if (statusCode >= 500) {
    logger.error(message, meta);
  } else if (statusCode >= 400) {
    logger.warn(message, meta);
  } else {
    logger.http(message, meta);
  }
};

logger.logError = (error, req = null) => {
  const meta = {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name,
    },
  };

  if (req) {
    meta.request = {
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userId: req.user?.id || null,
    };
  }

  logger.error(`Error: ${error.message}`, meta);
};

logger.logAuth = (action, userId, success, message = '') => {
  const meta = {
    action,
    userId,
    success,
    timestamp: new Date().toISOString(),
  };

  const logMessage = `Auth: ${action} - User: ${userId} - ${success ? 'SUCCESS' : 'FAILED'}${message ? ` - ${message}` : ''}`;

  if (success) {
    logger.info(logMessage, meta);
  } else {
    logger.warn(logMessage, meta);
  }
};

logger.logPayment = (action, userId, amount, currency, status, details = {}) => {
  const meta = {
    action,
    userId,
    amount,
    currency,
    status,
    ...details,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Payment: ${action} - User: ${userId} - ${amount} ${currency} - ${status}`, meta);
};

logger.logDocument = (type, userId, documentId, action, status = 'success') => {
  const meta = {
    type,
    userId,
    documentId,
    action,
    status,
    timestamp: new Date().toISOString(),
  };

  logger.info(`Document: ${type} - Action: ${action} - ID: ${documentId} - Status: ${status}`, meta);
};

module.exports = logger;
