/**
 * Global Error Handler Middleware
 */

const logger = require('../../utils/logger');

const errorHandler = (err, req, res, next) => {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    ip: req.ip,
  });

  // Default error response
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'Internal Server Error';
  let errorCode = err.code || 'INTERNAL_SERVER_ERROR';

  // Specific error handling
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    errorMessage = err.details || err.message;
  } else if (err.name === 'AuthenticationError') {
    statusCode = 401;
    errorCode = 'AUTHENTICATION_FAILED';
  } else if (err.name === 'AuthorizationError') {
    statusCode = 403;
    errorCode = 'FORBIDDEN';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    errorCode = 'NOT_FOUND';
  } else if (err.name === 'ConflictError') {
    statusCode = 409;
    errorCode = 'CONFLICT';
  } else if (err.name === 'DatabaseError') {
    statusCode = 500;
    errorCode = 'DATABASE_ERROR';
    // Don't expose database errors in production
    if (process.env.NODE_ENV === 'production') {
      errorMessage = 'Database operation failed';
    }
  }

  // Response
  res.status(statusCode).json({
    error: {
      code: errorCode,
      message: errorMessage,
      ...(process.env.NODE_ENV === 'development' && { details: err.details }),
      timestamp: new Date().toISOString(),
    },
    requestId: req.id || 'unknown',
  });
};

module.exports = errorHandler;
