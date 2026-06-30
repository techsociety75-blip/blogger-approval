/**
 * Bookings Routes
 * GET /api/bookings - List active bookings
 * GET /api/bookings/:id - Get booking details
 * POST /api/bookings/:id/extend - Extend booking
 * POST /api/bookings/:id/cancel - Cancel booking (Admin only)
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const bookingService = require('../../services/booking');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/bookings
 * List active bookings (Admin, Finance, Checking can see all; Staff/Team Leader see their own)
 */
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `SELECT * FROM active_bookings WHERE 1=1`;
    const params = [];

    // Filter based on role
    if (userRole === 'staff') {
      query += ` AND booked_by_staff_id = $1`;
      params.push(userId);
    } else if (userRole === 'team-leader') {
      // Team leader sees their team's bookings
      query += ` AND booked_by_staff_id IN (
        SELECT id FROM users WHERE team_id = (SELECT team_id FROM users WHERE id = $1)
      )`;
      params.push(userId);
    }
    // Admin and Finance see all bookings

    query += ' ORDER BY booked_until DESC';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        count: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/bookings/:id
 * Get booking details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/extend
 * Extend booking duration (Admin only)
 */
router.post('/:id/extend', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { daysToAdd = 7 } = req.body;
    const adminId = req.user.id;

    // Validate input
    if (!Number.isInteger(daysToAdd) || daysToAdd <= 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Days to add must be a positive integer',
        },
      });
    }

    if (daysToAdd > 90) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cannot extend booking by more than 90 days',
        },
      });
    }

    // Verify booking exists
    const bookingCheck = await pool.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    const booking = bookingCheck.rows[0];

    if (booking.status !== 'active') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot extend ${booking.status} booking`,
        },
      });
    }

    // Call service to extend
    const extendedBooking = await bookingService.extendBooking(
      id,
      daysToAdd,
      adminId
    );

    logger.audit('BOOKING_EXTENDED_API', 'booking', id, adminId, {
      daysAdded: daysToAdd,
      bloggerId: booking.blogger_uid,
    });

    res.json({
      success: true,
      message: 'Booking extended successfully',
      data: {
        bookingId: extendedBooking.bookingId,
        newBookedUntil: extendedBooking.newBokedUntil.toISOString(),
        daysRemaining: extendedBooking.daysRemaining,
        daysAdded: daysToAdd,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/bookings/:id/cancel
 * Cancel booking (Admin only)
 */
router.post('/:id/cancel', requireRole(['admin']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;

    if (!reason || reason.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Cancellation reason is required',
        },
      });
    }

    // Verify booking exists
    const bookingCheck = await pool.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [id]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Booking not found',
        },
      });
    }

    const booking = bookingCheck.rows[0];

    if (booking.status !== 'active') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot cancel ${booking.status} booking`,
        },
      });
    }

    // Call service to cancel
    const cancelledBooking = await bookingService.cancelBooking(
      id,
      reason,
      adminId
    );

    logger.audit('BOOKING_CANCELLED_API', 'booking', id, adminId, {
      bloggerId: booking.blogger_uid,
      reason,
    });

    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      data: {
        bookingId: cancelledBooking.bookingId,
        status: cancelledBooking.status,
        message: cancelledBooking.message,
        reason,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
