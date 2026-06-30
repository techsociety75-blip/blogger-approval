/**
 * Authentication Routes
 * POST /api/auth/login
 * POST /api/auth/register (admin only)
 * POST /api/auth/refresh
 * POST /api/auth/logout
 */

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * POST /api/auth/login
 * Login with username and password
 */
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Username and password are required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Find user
    const userResult = await pool.query(
      `SELECT id, username, email, password_hash, role, team_id, first_name, last_name
       FROM users WHERE username = $1 AND status = 'active'`,
      [username]
    );

    if (userResult.rows.length === 0) {
      logger.warn({
        type: 'LOGIN_FAILED',
        username,
        reason: 'User not found',
        ip: req.ip,
      });

      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid username or password',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const user = userResult.rows[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      logger.warn({
        type: 'LOGIN_FAILED',
        username,
        reason: 'Invalid password',
        ip: req.ip,
      });

      return res.status(401).json({
        error: {
          code: 'AUTHENTICATION_FAILED',
          message: 'Invalid username or password',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Update last login
    await pool.query(
      `UPDATE users SET last_login = NOW() WHERE id = $1`,
      [user.id]
    );

    // Generate tokens
    const accessToken = jwt.sign(
      {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        teamId: user.team_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: '30d' }
    );

    logger.info({
      type: 'LOGIN_SUCCESS',
      userId: user.id,
      username: user.username,
      role: user.role,
      ip: req.ip,
    });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: user.role,
          teamId: user.team_id,
        },
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRE || '7d',
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
router.post('/refresh', (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRE || '7d',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Logout (typically just clears client-side token)
 */
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout successful',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
