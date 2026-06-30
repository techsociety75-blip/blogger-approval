/**
 * Google Sheets Sync Job
 * PHASE 2 - Scheduled Synchronization
 *
 * Runs every 2 minutes to sync data between database and Google Sheets
 * - Uploads: Bloggers, applications, bookings to Sheets
 * - Downloads: Blacklist updates from Sheets
 *
 * Usage: npm run jobs:sheets-sync
 */

const { getGoogleSheetsService } = require('../services/googleSheets');
const logger = require('../utils/logger');

let syncJob = null;

/**
 * Start the sync job (runs every 2 minutes)
 */
async function startSheetsSync() {
  logger.info('Google Sheets sync job starting...');

  try {
    const googleSheets = await getGoogleSheetsService();

    // Run immediately on start
    await googleSheets.performFullSync();

    // Schedule every 2 minutes (120000 ms)
    syncJob = setInterval(async () => {
      try {
        await googleSheets.performFullSync();
      } catch (error) {
        logger.error('Error in scheduled Sheets sync:', error);
      }
    }, 120000); // 2 minutes

    logger.info('Google Sheets sync job started - syncing every 2 minutes');
  } catch (error) {
    logger.error('Failed to start Google Sheets sync job:', error);
    process.exit(1);
  }
}

/**
 * Stop the sync job
 */
function stopSheetsSync() {
  if (syncJob) {
    clearInterval(syncJob);
    logger.info('Google Sheets sync job stopped');
  }
}

/**
 * Manual sync trigger (for admin endpoints)
 */
async function triggerManualSync() {
  try {
    const googleSheets = await getGoogleSheetsService();
    const result = await googleSheets.performFullSync();
    return {
      success: result,
      message: result ? 'Sync completed successfully' : 'Sync failed',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logger.error('Manual sync failed:', error);
    return {
      success: false,
      message: `Sync failed: ${error.message}`,
      timestamp: new Date().toISOString(),
    };
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  stopSheetsSync();
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  startSheetsSync().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = {
  startSheetsSync,
  stopSheetsSync,
  triggerManualSync,
};
