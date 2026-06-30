/**
 * Booking Expiry Job
 * Scheduled job to auto-expire bookings and release bloggers
 * Should run every hour via cron or similar scheduler
 *
 * Usage:
 * - Add to package.json scripts: "expiry-job": "node src/jobs/bookingExpiry.js"
 * - Or run via cron: 0 * * * * cd /app && npm run expiry-job
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const bookingService = require('../services/booking');

async function runBookingExpiryJob() {
  try {
    logger.info('Starting booking expiry job...');

    const startTime = Date.now();

    // Call the service to auto-expire bookings
    const result = await bookingService.autoExpireBookings();

    const duration = Date.now() - startTime;

    logger.info(`Booking expiry job completed`, {
      expiredCount: result.expiredCount,
      duration: `${duration}ms`,
    });

    // Exit gracefully
    process.exit(0);
  } catch (error) {
    logger.error('Booking expiry job failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Run the job if executed directly
if (require.main === module) {
  runBookingExpiryJob();
}

module.exports = {
  runBookingExpiryJob,
};
