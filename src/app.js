/**
 * Main Express Application
 * Blogger Cooperation Approval & Budget Management System
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Middleware
const errorHandler = require('./api/middleware/errorHandler');
const requestLogger = require('./api/middleware/requestLogger');
const authMiddleware = require('./api/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

// Helmet for security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ============================================================
// BODY PARSING & LOGGING MIDDLEWARE
// ============================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(requestLogger);

// ============================================================
// ROUTES
// ============================================================

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API version
app.get('/api/version', (req, res) => {
  res.json({
    version: '1.0.0',
    name: 'Blogger Approval System',
    status: 'beta',
  });
});

// Authentication routes (will be created next)
app.use('/api/auth', require('./api/routes/auth'));

// Protected routes (require authentication)
app.use('/api/bloggers', authMiddleware, require('./api/routes/bloggers'));
app.use('/api/applications', authMiddleware, require('./api/routes/applications'));
app.use('/api/bookings', authMiddleware, require('./api/routes/bookings'));
app.use('/api/admin', authMiddleware, require('./api/routes/admin'));
app.use('/api/reports', authMiddleware, require('./api/routes/reports'));

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString(),
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// ============================================================
// SERVER STARTUP
// ============================================================

const server = app.listen(PORT, () => {
  console.log('\n🚀 Blogger Approval System - Backend API');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌍 URL: http://localhost:${PORT}`);
  console.log(`📡 API: http://localhost:${PORT}/api`);
  console.log(`🏥 Health: http://localhost:${PORT}/health\n`);

  if (process.env.NODE_ENV === 'development') {
    console.log('📝 Mode: Development');
    console.log('🔧 Features: Hot reload enabled\n');
  }
});

// ============================================================
// GRACEFUL SHUTDOWN
// ============================================================

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
