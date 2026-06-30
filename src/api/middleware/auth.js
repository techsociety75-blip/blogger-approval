/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user info
 */

const jwt = require('jsonwebtoken');
const logger = require('../../utils/logger');

const authMiddleware = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.get('Authorization');
    if (!authHeader) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authorization token provided',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Extract token
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header format',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    logger.debug({
      type: 'AUTH_SUCCESS',
      userId: req.user.id,
      role: req.user.role,
    });

    next();
  } catch (error) {
    logger.warn({
      type: 'AUTH_FAILED',
      error: error.message,
      path: req.path,
      ip: req.ip,
    });

    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        timestamp: new Date().toISOString(),
      },
    });
  }
};

/**
 * Role-based Access Control Middleware
 * @param {string[]} allowedRoles - Array of allowed roles
 */
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn({
        type: 'AUTHORIZATION_FAILED',
        userId: req.user.id,
        role: req.user.role,
        requiredRoles: allowedRoles,
        path: req.path,
      });

      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to access this resource',
          timestamp: new Date().toISOString(),
        },
      });
    }

    next();
  };
};

/**
 * Optional Authentication Middleware
 * Doesn't fail if token is missing, but extracts user if present
 */
const optionalAuth = (req, res, next) => {
  try {
    const authHeader = req.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    }
  } catch (error) {
    // Silently ignore - optional auth
  }
  next();
};

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
module.exports.optionalAuth = optionalAuth;
