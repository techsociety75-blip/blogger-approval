/**
 * Booking Service
 * Handles 7-day booking logic, creation, expiry, and validation
 * CRITICAL COMPONENT
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Create 7-day booking for blogger
 * Called when Finance approves an application
 */
async function createBooking(bloggerId, staffId, staffName, applicationId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Create booking record
    const bookingId = uuidv4();
    const bookedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const bookingResult = await client.query(
      `INSERT INTO blogger_bookings (
        id, blogger_uid, booked_by_staff_id, booked_by_staff_name,
        application_id, booked_until, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')
      RETURNING *`,
      [bookingId, bloggerId, staffId, staffName, applicationId, bookedUntil]
    );

    const booking = bookingResult.rows[0];

    // Update blogger record with booking info
    await client.query(
      `UPDATE bloggers SET
        booked_status = 'booked',
        booked_by_staff_id = $1,
        booked_by_staff_name = $2,
        booked_until = $3,
        booking_id = $4
       WHERE uid = $5`,
      [staffId, staffName, bookedUntil, bookingId, bloggerId]
    );

    // Update application with booking reference
    await client.query(
      `UPDATE applications SET
        booking_id = $1,
        booked_by_name = $2
       WHERE id = $3`,
      [bookingId, staffName, applicationId]
    );

    await client.query('COMMIT');

    logger.audit('BOOKING_CREATED', 'booking', bookingId, staffId, {
      bloggerId,
      staffName,
      applicationId,
      bookedUntil: bookedUntil.toISOString(),
      durationDays: 7,
    });

    return {
      bookingId,
      bloggerId,
      bookedBy: staffName,
      bookedUntil,
      daysRemaining: 7,
      status: 'active',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create booking', {
      bloggerId,
      staffId,
      applicationId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Check if blogger is booked and if user can submit
 * CRITICAL: Enforces booking restrictions
 */
async function checkBookingStatus(bloggerId, userId) {
  try {
    const result = await pool.query(
      `SELECT
        booked_status,
        booked_by_staff_id,
        booked_by_staff_name,
        booked_until,
        EXTRACT(DAY FROM (booked_until - NOW())) as days_remaining
       FROM bloggers
       WHERE uid = $1`,
      [bloggerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Blogger not found');
    }

    const blogger = result.rows[0];

    // Check if user can submit
    let canSubmit = true;
    let blockReason = null;

    if (blogger.booked_status === 'booked') {
      // Check if booking has expired (just in case, should be auto-expired)
      const daysRemaining = parseFloat(blogger.days_remaining);
      if (daysRemaining <= 0) {
        // Expired - update status
        await pool.query(
          `UPDATE blogger_bookings SET status = 'expired' WHERE booking_id IN
           (SELECT booking_id FROM bloggers WHERE uid = $1 AND booked_status = 'booked')`,
          [bloggerId]
        );
        await pool.query(
          `UPDATE bloggers SET booked_status = 'available' WHERE uid = $1`,
          [bloggerId]
        );
        canSubmit = true;
      } else if (blogger.booked_by_staff_id !== userId) {
        // Booked by different staff
        canSubmit = false;
        blockReason = `This blogger is exclusively booked to ${blogger.booked_by_staff_name} until ${new Date(blogger.booked_until).toLocaleDateString()} (${Math.ceil(daysRemaining)} days remaining)`;
      }
      // If booked by same staff, canSubmit = true
    }

    return {
      bookerStatus: blogger.booked_status,
      canSubmit,
      blockReason,
      booking: blogger.booked_status === 'booked' ? {
        bookedBy: blogger.booked_by_staff_name,
        bookedUntil: blogger.booked_until,
        daysRemaining: Math.ceil(parseFloat(blogger.days_remaining)),
      } : null,
    };
  } catch (error) {
    logger.error('Failed to check booking status', {
      bloggerId,
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Extend existing booking (Admin only)
 */
async function extendBooking(bookingId, daysToAdd = 7, adminId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = result.rows[0];
    const newBokedUntil = new Date(
      new Date(booking.booked_until).getTime() + daysToAdd * 24 * 60 * 60 * 1000
    );

    // Update booking
    await client.query(
      `UPDATE blogger_bookings SET
        booked_until = $1,
        extended_count = extended_count + 1,
        extended_by = $2,
        extended_at = NOW(),
        updated_at = NOW()
       WHERE id = $3`,
      [newBokedUntil, adminId, bookingId]
    );

    // Update blogger
    await client.query(
      `UPDATE bloggers SET booked_until = $1 WHERE uid = $2`,
      [newBokedUntil, booking.blogger_uid]
    );

    await client.query('COMMIT');

    logger.audit('BOOKING_EXTENDED', 'booking', bookingId, adminId, {
      daysAdded: daysToAdd,
      newBokedUntil: newBokedUntil.toISOString(),
    });

    return {
      bookingId,
      newBokedUntil,
      daysRemaining: Math.ceil(
        (newBokedUntil - new Date()) / (1000 * 60 * 60 * 24)
      ),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to extend booking', {
      bookingId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Cancel booking (Admin only)
 */
async function cancelBooking(bookingId, reason, adminId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT * FROM blogger_bookings WHERE id = $1`,
      [bookingId]
    );

    if (result.rows.length === 0) {
      throw new Error('Booking not found');
    }

    const booking = result.rows[0];

    // Update booking
    await client.query(
      `UPDATE blogger_bookings SET
        status = 'cancelled',
        cancelled_by = $1,
        cancelled_at = NOW(),
        cancellation_reason = $2,
        updated_at = NOW()
       WHERE id = $3`,
      [adminId, reason, bookingId]
    );

    // Update blogger
    await client.query(
      `UPDATE bloggers SET booked_status = 'available' WHERE uid = $1`,
      [booking.blogger_uid]
    );

    await client.query('COMMIT');

    logger.audit('BOOKING_CANCELLED', 'booking', bookingId, adminId, {
      bloggerId: booking.blogger_uid,
      reason,
    });

    return {
      bookingId,
      status: 'cancelled',
      message: 'Booking cancelled successfully',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to cancel booking', {
      bookingId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Auto-expire bookings (run as scheduled job)
 * Marks bookings as expired and releases bloggers
 */
async function autoExpireBookings() {
  const client = await pool.connect();

  try {
    // Find expired bookings
    const expiredResult = await client.query(
      `SELECT id, blogger_uid FROM blogger_bookings
       WHERE status = 'active' AND booked_until < NOW()`
    );

    if (expiredResult.rows.length === 0) {
      logger.debug('No bookings to expire');
      return { expiredCount: 0 };
    }

    // Mark as expired
    await client.query(
      `UPDATE blogger_bookings SET status = 'expired'
       WHERE status = 'active' AND booked_until < NOW()`
    );

    // Release bloggers
    const expiredBookingIds = expiredResult.rows.map(r => r.id);
    await client.query(
      `UPDATE bloggers SET booked_status = 'available'
       WHERE booking_id = ANY($1::uuid[])`,
      [expiredBookingIds]
    );

    logger.audit('BOOKINGS_AUTO_EXPIRED', 'booking', null, 'system', {
      expiredCount: expiredResult.rows.length,
      bloggerIds: expiredResult.rows.map(r => r.blogger_uid),
    });

    return { expiredCount: expiredResult.rows.length };
  } catch (error) {
    logger.error('Failed to auto-expire bookings', {
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

module.exports = {
  createBooking,
  checkBookingStatus,
  extendBooking,
  cancelBooking,
  autoExpireBookings,
};
