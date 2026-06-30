/**
 * Logger Utility
 * Handles all logging across the application
 */

const fs = require('fs');
const path = require('path');

const LOG_DIR = path.join(__dirname, '../../logs');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Ensure logs directory exists
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const formatLog = (level, message, data) => {
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message: typeof message === 'string' ? message : 'Event',
    ...data,
  });
};

const logger = {
  debug: (message, data = {}) => {
    if (LOG_LEVELS[LOG_LEVEL] <= LOG_LEVELS.debug) {
      console.log(`🔍 ${formatLog('debug', message, data)}`);
    }
  },

  info: (message, data = {}) => {
    if (LOG_LEVELS[LOG_LEVEL] <= LOG_LEVELS.info) {
      console.log(`ℹ️  ${formatLog('info', message, data)}`);
    }
  },

  warn: (message, data = {}) => {
    if (LOG_LEVELS[LOG_LEVEL] <= LOG_LEVELS.warn) {
      console.warn(`⚠️  ${formatLog('warn', message, data)}`);
    }
  },

  error: (message, data = {}) => {
    if (LOG_LEVELS[LOG_LEVEL] <= LOG_LEVELS.error) {
      console.error(`❌ ${formatLog('error', message, data)}`);

      // Also write to file
      const logFile = path.join(LOG_DIR, 'error.log');
      fs.appendFileSync(logFile, formatLog('error', message, data) + '\n');
    }
  },

  // Audit logging
  audit: (action, entityType, entityId, userId, details = {}) => {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'AUDIT',
      action,
      entityType,
      entityId,
      userId,
      ...details,
    };

    console.log(`📋 ${JSON.stringify(logEntry)}`);

    // Write audit log to file
    const auditLogFile = path.join(LOG_DIR, 'audit.log');
    fs.appendFileSync(auditLogFile, JSON.stringify(logEntry) + '\n');
  },
};

module.exports = logger;
