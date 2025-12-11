/**
 * Custom Error Classes for ChatBill Application
 */

class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validare eșuată') {
    super(message, 400);
    this.name = 'ValidationError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Nu ești autentificat. Te rugăm să te loghezi.') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Nu ai permisiunea de a accesa această resursă.') {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resursă', identifier = '') {
    const message = identifier
      ? `${resource} cu ID-ul "${identifier}" nu a fost găsită.`
      : `${resource} nu a fost găsită.`;
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflict - resursa există deja.') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class BadRequestError extends AppError {
  constructor(message = 'Cerere invalidă.') {
    super(message, 400);
    this.name = 'BadRequestError';
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Eroare la interacțiunea cu baza de date.') {
    super(message, 500);
    this.name = 'DatabaseError';
  }
}

class ExternalServiceError extends AppError {
  constructor(serviceName = 'Serviciu extern', message = 'nedisponibil') {
    super(`${serviceName} ${message}`, 503);
    this.name = 'ExternalServiceError';
  }
}

class PDFGenerationError extends AppError {
  constructor(message = 'Eroare la generarea documentului PDF.') {
    super(message, 500);
    this.name = 'PDFGenerationError';
  }
}

class StripeError extends AppError {
  constructor(message = 'Eroare la procesarea plății.') {
    super(message, 402);
    this.name = 'StripeError';
  }
}

class TokenExpiredError extends AppError {
  constructor(message = 'Token expirat. Te rugăm să te loghezi din nou.') {
    super(message, 401);
    this.name = 'TokenExpiredError';
  }
}

class RateLimitError extends AppError {
  constructor(message = 'Prea multe cereri. Te rugăm să încerci din nou mai târziu.') {
    super(message, 429);
    this.name = 'RateLimitError';
  }
}

module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  BadRequestError,
  DatabaseError,
  ExternalServiceError,
  PDFGenerationError,
  StripeError,
  TokenExpiredError,
  RateLimitError
};
