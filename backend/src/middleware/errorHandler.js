const { AppError } = require('../utils/errors');
const { Prisma } = require('@prisma/client');
const logger = require('../config/logger');

/**
 * Development error response - includes stack trace
 */
const sendErrorDev = (err, req, res) => {
  logger.logError(err, req);

  res.status(err.statusCode).json({
    success: false,
    status: err.status,
    message: err.message,
    error: err,
    stack: err.stack
  });
};

/**
 * Production error response - sanitized
 */
const sendErrorProd = (err, req, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    logger.warn(`Operational error: ${err.message}`, {
      statusCode: err.statusCode,
      url: req.originalUrl,
      method: req.method
    });

    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  }
  // Programming or unknown error: don't leak error details
  else {
    logger.logError(err, req);

    res.status(500).json({
      success: false,
      message: 'Ceva nu a mers bine. Te rugăm să încerci din nou.'
    });
  }
};

/**
 * Handle Prisma unique constraint errors
 */
const handlePrismaUniqueError = (err) => {
  const target = err.meta?.target?.[0] || 'câmp';
  const message = `${target} există deja. Te rugăm să folosești o altă valoare.`;
  return new AppError(message, 409);
};

/**
 * Handle Prisma foreign key constraint errors
 */
const handlePrismaForeignKeyError = (err) => {
  const message = 'Referință invalidă. Resursa la care încerci să te conectezi nu există.';
  return new AppError(message, 400);
};

/**
 * Handle Prisma not found errors
 */
const handlePrismaNotFoundError = (err) => {
  const message = 'Resursa solicitată nu a fost găsită.';
  return new AppError(message, 404);
};

/**
 * Handle Prisma validation errors
 */
const handlePrismaValidationError = (err) => {
  const message = 'Date invalide. Te rugăm să verifici informațiile introduse.';
  return new AppError(message, 400);
};

/**
 * Handle JWT errors
 */
const handleJWTError = () => {
  return new AppError('Token invalid. Te rugăm să te loghezi din nou.', 401);
};

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () => {
  return new AppError('Token expirat. Te rugăm să te loghezi din nou.', 401);
};

/**
 * Handle Zod validation errors (if any slip through)
 */
const handleZodError = (err) => {
  const errors = err.errors.map(e => ({
    field: e.path.join('.'),
    message: e.message
  }));

  return new AppError(`Validare eșuată: ${errors[0].message}`, 400);
};

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, req, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;
    error.name = err.name;

    // Handle specific error types
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2002') {
        error = handlePrismaUniqueError(err);
      } else if (err.code === 'P2003') {
        error = handlePrismaForeignKeyError(err);
      } else if (err.code === 'P2025') {
        error = handlePrismaNotFoundError(err);
      } else {
        error = new AppError('Eroare la baza de date.', 500);
      }
    }

    if (err instanceof Prisma.PrismaClientValidationError) {
      error = handlePrismaValidationError(err);
    }

    if (err.name === 'JsonWebTokenError') {
      error = handleJWTError();
    }

    if (err.name === 'TokenExpiredError') {
      error = handleJWTExpiredError();
    }

    if (err.name === 'ZodError') {
      error = handleZodError(err);
    }

    // Stripe errors
    if (err.type && err.type.startsWith('Stripe')) {
      error = new AppError(`Eroare Stripe: ${err.message}`, 402);
      error.isOperational = true;
    }

    sendErrorProd(error, req, res);
  }
};

/**
 * Handle unhandled promise rejections
 */
process.on('unhandledRejection', (err) => {
  logger.error('💥 UNHANDLED REJECTION! Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  // In production, you might want to gracefully shutdown
  // process.exit(1);
});

/**
 * Handle uncaught exceptions
 */
process.on('uncaughtException', (err) => {
  logger.error('💥 UNCAUGHT EXCEPTION! Shutting down...', {
    name: err.name,
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

/**
 * Async error wrapper - wraps async route handlers
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  asyncHandler
};
