/**
 * Request Logging Middleware
 * Logs all HTTP requests
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../../utils/logger');

const requestLogger = (req, res, next) => {
  // Add request ID
  req.id = uuidv4();

  const startTime = Date.now();

  // Log request
  logger.info({
    type: 'HTTP_REQUEST',
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
  });

  // Capture response
  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;

    // Log response
    logger.info({
      type: 'HTTP_RESPONSE',
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id,
    });

    return originalJson.call(this, data);
  };

  next();
};

module.exports = requestLogger;
