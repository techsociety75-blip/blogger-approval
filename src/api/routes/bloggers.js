/**
 * Blogger Routes
 * GET /api/bloggers - Search bloggers
 * GET /api/bloggers/:uid - Get single blogger
 * GET /api/bloggers/:uid/booking-status - Check booking status
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const logger = require('../../utils/logger');

/**
 * GET /api/bloggers
 * Search bloggers by UID or username
 * Query: ?q=search_term&limit=20&offset=0
 */
router.get('/', async (req, res, next) => {
  try {
    const { q, limit = 20, offset = 0 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Search query must be at least 2 characters',
        },
      });
    }

    const startTime = Date.now();

    // Search bloggers
    const result = await pool.query(
      `SELECT uid, username, name, engagement_score, followers_count, cooperation_count,
              last_cooperation, blacklisted, blacklist_reason, blacklist_date,
              booked_status, booked_by_staff_name, booked_until
       FROM bloggers
       WHERE uid ILIKE $1 OR username ILIKE $2 OR name ILIKE $3
       LIMIT $4 OFFSET $5`,
      [`${q}%`, `${q}%`, `%${q}%`, limit, offset]
    );

    const responseTime = Date.now() - startTime;

    // Log search
    logger.audit('SEARCH_BLOGGER', 'blogger', null, req.user.id, {
      searchQuery: q,
      resultsCount: result.rows.length,
      responseTime: `${responseTime}ms`,
      ip: req.ip,
    });

    // Transform booking info
    const bloggers = result.rows.map(b => ({
      ...b,
      booking: b.booked_status === 'booked' ? {
        status: 'booked',
        bookedBy: b.booked_by_staff_name,
        bookedUntil: b.booked_until,
        daysRemaining: Math.ceil(
          (new Date(b.booked_until) - new Date()) / (1000 * 60 * 60 * 24)
        ),
      } : null,
    }));

    res.json({
      success: true,
      data: {
        results: bloggers,
        count: bloggers.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
        responseTime: `${responseTime}ms`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bloggers/:uid
 * Get single blogger with full details
 */
router.get('/:uid', async (req, res, next) => {
  try {
    const { uid } = req.params;

    const result = await pool.query(
      `SELECT * FROM bloggers WHERE uid = $1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Blogger not found',
        },
      });
    }

    const blogger = result.rows[0];

    // Get cooperation history
    const appsResult = await pool.query(
      `SELECT id, campaign_name, approved_budget, final_result, submitted_at
       FROM applications WHERE blogger_uid = $1 ORDER BY submitted_at DESC LIMIT 10`,
      [uid]
    );

    res.json({
      success: true,
      data: {
        ...blogger,
        booking: blogger.booked_status === 'booked' ? {
          status: 'booked',
          bookedBy: blogger.booked_by_staff_name,
          bookedUntil: blogger.booked_until,
          daysRemaining: Math.ceil(
            (new Date(blogger.booked_until) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        } : null,
        cooperationHistory: appsResult.rows,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bloggers/:uid/booking-status
 * Check if blogger is booked and if current user can submit
 */
router.get('/:uid/booking-status', async (req, res, next) => {
  try {
    const { uid } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT booked_status, booked_by_staff_id, booked_by_staff_name, booked_until
       FROM bloggers WHERE uid = $1`,
      [uid]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Blogger not found',
        },
      });
    }

    const blogger = result.rows[0];

    // Check if user can submit
    let canSubmit = true;
    let blockReason = null;

    if (blogger.booked_status === 'booked') {
      if (blogger.booked_by_staff_id !== userId) {
        canSubmit = false;
        blockReason = `This blogger is exclusively booked to ${blogger.booked_by_staff_name} until ${new Date(blogger.booked_until).toLocaleDateString()}`;
      }
    }

    res.json({
      success: true,
      data: {
        uid,
        booking: blogger.booked_status === 'booked' ? {
          status: 'booked',
          bookedBy: blogger.booked_by_staff_name,
          bookedUntil: blogger.booked_until,
          daysRemaining: Math.ceil(
            (new Date(blogger.booked_until) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        } : null,
        canSubmit,
        blockReason,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
