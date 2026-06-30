/**
 * Google Sheets Integration Service
 * PHASE 2 - Google Sheets Sync
 *
 * Bidirectional sync between database and Google Sheets
 * Syncs every 2 minutes:
 * - Upload: Applications, bookings, bloggers to Sheets
 * - Download: Blogger data, blacklist updates from Sheets
 */

const { google } = require('googleapis');
const logger = require('../utils/logger');
const pool = require('../config/database');

class GoogleSheetsService {
  constructor() {
    this.sheetsAPI = null;
    this.spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    this.auth = null;
  }

  /**
   * Initialize Google Sheets authentication
   * Requires GOOGLE_SHEETS_CREDENTIALS and GOOGLE_SHEETS_ID env vars
   */
  async initialize() {
    try {
      if (!process.env.GOOGLE_SHEETS_CREDENTIALS) {
        logger.warn('Google Sheets credentials not configured - sync disabled');
        return false;
      }

      const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheetsAPI = google.sheets({ version: 'v4', auth: this.auth });
      logger.info('Google Sheets authentication initialized');
      return true;
    } catch (error) {
      logger.error('Google Sheets initialization failed:', error);
      return false;
    }
  }

  /**
   * Get blogger data from database for Sheets upload
   */
  async getBloggerDataForSheets() {
    try {
      const result = await pool.query(`
        SELECT
          id,
          name,
          email,
          phone,
          genre,
          followers,
          engagement_rate,
          booked_status,
          blacklist_status,
          cooperation_count,
          last_cooperation_date,
          created_at
        FROM bloggers
        ORDER BY created_at DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching blogger data for Sheets:', error);
      throw error;
    }
  }

  /**
   * Get applications data from database for Sheets upload
   */
  async getApplicationDataForSheets() {
    try {
      const result = await pool.query(`
        SELECT
          a.id,
          a.blogger_id,
          b.name as blogger_name,
          a.submitted_by,
          u.username as submitted_by_name,
          a.checking_status,
          a.finance_status,
          a.status,
          a.created_at,
          a.checking_approved_at,
          a.finance_approved_at
        FROM applications a
        LEFT JOIN bloggers b ON a.blogger_id = b.id
        LEFT JOIN users u ON a.submitted_by = u.id
        ORDER BY a.created_at DESC
        LIMIT 100
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching application data for Sheets:', error);
      throw error;
    }
  }

  /**
   * Get bookings data from database for Sheets upload
   */
  async getBookingDataForSheets() {
    try {
      const result = await pool.query(`
        SELECT
          id,
          blogger_id,
          staff_id,
          booked_by_staff_name,
          booked_from,
          booked_until,
          status,
          created_at
        FROM bookings
        WHERE status IN ('active', 'extended')
        ORDER BY booked_until DESC
      `);
      return result.rows;
    } catch (error) {
      logger.error('Error fetching booking data for Sheets:', error);
      throw error;
    }
  }

  /**
   * Upload bloggers to Google Sheets
   */
  async uploadBloggers() {
    try {
      if (!this.sheetsAPI) return false;

      const bloggers = await this.getBloggerDataForSheets();

      const values = [
        ['ID', 'Name', 'Email', 'Phone', 'Genre', 'Followers', 'Engagement %', 'Booked Status', 'Blacklist', 'Cooperation Count', 'Last Cooperation', 'Added Date'],
        ...bloggers.map(b => [
          b.id,
          b.name,
          b.email,
          b.phone || '',
          b.genre || '',
          b.followers || 0,
          b.engagement_rate || 0,
          b.booked_status,
          b.blacklist_status || 'none',
          b.cooperation_count,
          b.last_cooperation_date ? new Date(b.last_cooperation_date).toLocaleDateString() : 'Never',
          new Date(b.created_at).toLocaleDateString(),
        ]),
      ];

      await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Bloggers!A1',
        valueInputOption: 'RAW',
        resource: { values },
      });

      logger.info(`Uploaded ${bloggers.length} bloggers to Sheets`);
      return true;
    } catch (error) {
      logger.error('Error uploading bloggers to Sheets:', error);
      return false;
    }
  }

  /**
   * Upload applications to Google Sheets
   */
  async uploadApplications() {
    try {
      if (!this.sheetsAPI) return false;

      const applications = await this.getApplicationDataForSheets();

      const values = [
        ['ID', 'Blogger', 'Submitted By', 'Status', 'Checking', 'Finance', 'Submitted Date', 'Checking Approved', 'Finance Approved'],
        ...applications.map(a => [
          a.id,
          a.blogger_name || 'Unknown',
          a.submitted_by_name || 'Unknown',
          a.status,
          a.checking_status || '-',
          a.finance_status || '-',
          new Date(a.created_at).toLocaleDateString(),
          a.checking_approved_at ? new Date(a.checking_approved_at).toLocaleDateString() : '-',
          a.finance_approved_at ? new Date(a.finance_approved_at).toLocaleDateString() : '-',
        ]),
      ];

      await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Applications!A1',
        valueInputOption: 'RAW',
        resource: { values },
      });

      logger.info(`Uploaded ${applications.length} applications to Sheets`);
      return true;
    } catch (error) {
      logger.error('Error uploading applications to Sheets:', error);
      return false;
    }
  }

  /**
   * Upload bookings to Google Sheets
   */
  async uploadBookings() {
    try {
      if (!this.sheetsAPI) return false;

      const bookings = await this.getBookingDataForSheets();

      const values = [
        ['ID', 'Blogger ID', 'Staff Member', 'Booked From', 'Booked Until', 'Status', 'Created'],
        ...bookings.map(b => [
          b.id,
          b.blogger_id,
          b.booked_by_staff_name,
          new Date(b.booked_from).toLocaleDateString(),
          new Date(b.booked_until).toLocaleDateString(),
          b.status,
          new Date(b.created_at).toLocaleDateString(),
        ]),
      ];

      await this.sheetsAPI.spreadsheets.values.update({
        spreadsheetId: this.spreadsheetId,
        range: 'Bookings!A1',
        valueInputOption: 'RAW',
        resource: { values },
      });

      logger.info(`Uploaded ${bookings.length} bookings to Sheets`);
      return true;
    } catch (error) {
      logger.error('Error uploading bookings to Sheets:', error);
      return false;
    }
  }

  /**
   * Read blacklist updates from Google Sheets and apply to database
   */
  async syncBlacklistFromSheets() {
    try {
      if (!this.sheetsAPI) return false;

      const response = await this.sheetsAPI.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Blacklist!A2:C',
      });

      const rows = response.data.values || [];
      let updated = 0;

      for (const row of rows) {
        const [bloggerId, reason, active] = row;

        if (bloggerId && active?.toLowerCase() === 'true') {
          await pool.query(
            'UPDATE bloggers SET blacklist_status = $1 WHERE id = $2',
            [reason || 'blacklisted', bloggerId]
          );
          updated++;
        }
      }

      if (updated > 0) {
        logger.info(`Synced ${updated} blacklist updates from Sheets`);
      }
      return true;
    } catch (error) {
      logger.error('Error syncing blacklist from Sheets:', error);
      return false;
    }
  }

  /**
   * Full bidirectional sync
   * Called every 2 minutes
   */
  async performFullSync() {
    try {
      logger.info('Starting Google Sheets sync...');

      if (!this.sheetsAPI) {
        logger.warn('Google Sheets not initialized - skipping sync');
        return false;
      }

      // Upload to Sheets
      await Promise.all([
        this.uploadBloggers(),
        this.uploadApplications(),
        this.uploadBookings(),
      ]);

      // Download from Sheets
      await this.syncBlacklistFromSheets();

      logger.info('Google Sheets sync completed successfully');
      return true;
    } catch (error) {
      logger.error('Error during Google Sheets sync:', error);
      return false;
    }
  }

  /**
   * Create sample Google Sheets template (for setup)
   */
  async createTemplateSheets() {
    try {
      if (!this.sheetsAPI) return null;

      const spreadsheet = await this.sheetsAPI.spreadsheets.create({
        resource: {
          properties: {
            title: 'Blogger Approval System - Data Sync',
          },
          sheets: [
            { properties: { title: 'Bloggers' } },
            { properties: { title: 'Applications' } },
            { properties: { title: 'Bookings' } },
            { properties: { title: 'Blacklist' } },
          ],
        },
      });

      logger.info(`Created new Google Sheets: ${spreadsheet.data.spreadsheetId}`);
      return spreadsheet.data.spreadsheetId;
    } catch (error) {
      logger.error('Error creating template Sheets:', error);
      return null;
    }
  }
}

// Singleton instance
let instance = null;

async function getGoogleSheetsService() {
  if (!instance) {
    instance = new GoogleSheetsService();
    await instance.initialize();
  }
  return instance;
}

module.exports = { getGoogleSheetsService, GoogleSheetsService };
