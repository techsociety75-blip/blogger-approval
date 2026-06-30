/**
 * Reports Routes
 * PHASE 5 - Analytics & Reporting
 *
 * GET /api/reports/dashboard - Role-specific dashboard
 * GET /api/reports/timeline - Application timeline (last 30 days)
 * GET /api/reports/bloggers - Blogger performance report
 * GET /api/reports/budget - Budget utilization report
 * GET /api/reports/export - Export data (Admin only)
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const reportsService = require('../../services/reports');
const { requireRole } = require('../middleware/auth');

/**
 * GET /api/reports/dashboard
 * Role-specific dashboard statistics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const userRole = req.user.role;
    const userId = req.user.id;

    const dashboard = await reportsService.getRoleDashboard(userId, userRole);

    res.json({
      success: true,
      data: {
        dashboard,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/timeline
 * Application submission timeline (last 30 days by default)
 */
router.get('/timeline', async (req, res, next) => {
  try {
    const { days = 30 } = req.query;

    const timeline = await reportsService.getApplicationTimeline(parseInt(days));

    res.json({
      success: true,
      data: {
        timeline,
        days: parseInt(days),
        count: timeline.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/bloggers
 * Blogger performance report
 */
router.get('/bloggers', async (req, res, next) => {
  try {
    const report = await reportsService.getBloggerPerformanceReport();

    res.json({
      success: true,
      data: {
        bloggers: report,
        count: report.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/budget
 * Budget utilization report
 */
router.get('/budget', async (req, res, next) => {
  try {
    const report = await reportsService.getBudgetUtilizationReport();

    res.json({
      success: true,
      data: {
        teams: report,
        count: report.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reports/export
 * Export data (Admin only)
 */
router.get('/export', requireRole(['admin']), async (req, res, next) => {
  try {
    const { type = 'applications' } = req.query;

    const validTypes = ['applications', 'bookings', 'bloggers', 'users'];

    if (!validTypes.includes(type)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid export type. Must be one of: ${validTypes.join(', ')}`,
        },
      });
    }

    const exportData = await reportsService.exportData(type);

    logger.audit('DATA_EXPORT', 'export', type, req.user.id, {
      type,
      count: exportData.count,
    });

    // Return CSV file
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
    res.send(exportData.data);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
