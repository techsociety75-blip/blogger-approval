/**
 * Applications Routes
 * POST /api/applications - Submit new application
 * GET /api/applications - Get applications
 * GET /api/applications/:id - Get single application
 * POST /api/applications/:id/approve - Approve (Checking)
 * POST /api/applications/:id/reject - Reject
 * POST /api/applications/:id/finance-approve - Approve with budget (Finance)
 * POST /api/applications/:id/escalate - Escalate to Team Leader
 */

const express = require('express');
const router = express.Router();
const pool = require('../../config/database');
const logger = require('../../utils/logger');
const applicationService = require('../../services/application');
const bookingService = require('../../services/booking');
const { requireRole } = require('../middleware/auth');

/**
 * POST /api/applications
 * Submit new application (Staff role only)
 */
router.post('/', async (req, res, next) => {
  try {
    const { bloggerUid, campaignName, requestedBudget, notes } = req.body;
    const staffId = req.user.id;

    if (!bloggerUid || !campaignName || !requestedBudget) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
        },
      });
    }

    // Check booking status - CRITICAL: Block if booked by another staff
    const bookingCheck = await pool.query(
      `SELECT booked_status, booked_by_staff_id FROM bloggers WHERE uid = $1`,
      [bloggerUid]
    );

    if (bookingCheck.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Blogger not found',
        },
      });
    }

    const blogger = bookingCheck.rows[0];
    if (blogger.booked_status === 'booked' && blogger.booked_by_staff_id !== staffId) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'This blogger is booked by another staff member',
          detail: 'You cannot submit applications for this blogger until the booking expires',
        },
      });
    }

    // Get staff info
    const staffResult = await pool.query(
      `SELECT first_name, last_name, team_id FROM users WHERE id = $1`,
      [staffId]
    );

    const staff = staffResult.rows[0];
    const staffName = `${staff.first_name} ${staff.last_name}`;

    // Generate application ID
    const idResult = await pool.query(
      `SELECT MAX(CAST(SUBSTRING(id FROM 5) AS INTEGER)) as max_id FROM applications WHERE id LIKE 'REQ-%'`
    );
    const nextId = (idResult.rows[0]?.max_id || 0) + 1;
    const applicationId = `REQ-${String(nextId).padStart(4, '0')}`;

    // Create application
    const result = await pool.query(
      `INSERT INTO applications (
        id, blogger_uid, staff_id, staff_name, team_id, campaign_name,
        requested_budget, notes_to_checking, eligibility_status,
        checking_status, finance_status, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      RETURNING *`,
      [
        applicationId,
        bloggerUid,
        staffId,
        staffName,
        staff.team_id,
        campaignName,
        requestedBudget,
        notes || '',
        'eligible', // Will be updated based on eligibility rules
        'pending',
        'pending',
      ]
    );

    const app = result.rows[0];

    logger.audit('SUBMIT_APPLICATION', 'application', app.id, staffId, {
      bloggerUid,
      campaignName,
      budget: requestedBudget,
      staffName,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: app,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/applications
 * Get applications (filtered by role)
 */
router.get('/', async (req, res, next) => {
  try {
    const { status, role } = req.query;
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = 'SELECT * FROM applications WHERE 1=1';
    const params = [];

    // Filter by user role
    if (userRole === 'staff') {
      query += ' AND staff_id = $1';
      params.push(userId);
    } else if (userRole === 'checking') {
      query += ' AND checking_status = $1';
      params.push(status || 'pending');
    } else if (userRole === 'finance') {
      query += ' AND finance_status = $1';
      params.push(status || 'pending');
    } else if (userRole === 'team-leader') {
      // Team leader sees team applications
      query += ' AND team_id = (SELECT team_id FROM users WHERE id = $1)';
      params.push(userId);
    }
    // Admin sees all

    query += ' ORDER BY submitted_at DESC LIMIT 100';

    const result = await pool.query(query, params);

    res.json({
      success: true,
      data: {
        applications: result.rows,
        count: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/applications/:id
 * Get single application
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
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
 * POST /api/applications/:id/approve (Checking Dept)
 * Checking Department approves application and sends to Finance
 */
router.post('/:id/approve', requireRole(['checking']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const checkedBy = req.user.id;

    // Verify application exists
    const appResult = await pool.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
    }

    const app = appResult.rows[0];

    // Verify application is in pending state
    if (app.checking_status !== 'pending') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot approve application. Current status: ${app.checking_status}`,
        },
      });
    }

    // Call service to approve
    const approvedApp = await applicationService.approveByChecking(
      id,
      checkedBy,
      remarks || ''
    );

    res.json({
      success: true,
      message: 'Application approved by Checking Department',
      data: {
        application: approvedApp,
        nextStep: 'Awaiting Finance Department approval',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/reject
 * Reject application (Checking or Finance)
 */
router.post('/:id/reject', requireRole(['checking', 'finance']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { remarks } = req.body;
    const rejectedBy = req.user.id;
    const userRole = req.user.role;

    if (!remarks) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Rejection remarks are required',
        },
      });
    }

    // Verify application exists
    const appResult = await pool.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
    }

    const app = appResult.rows[0];

    // Determine if checking or finance rejection
    const source = userRole === 'checking' ? 'checking' : 'finance';
    const statusField = source === 'checking' ? app.checking_status : app.finance_status;

    // Verify application can be rejected
    if (statusField !== 'pending') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot reject application. Current ${source} status: ${statusField}`,
        },
      });
    }

    // Call service to reject
    const rejectedApp = await applicationService.rejectApplication(
      id,
      rejectedBy,
      remarks,
      source
    );

    res.json({
      success: true,
      message: `Application rejected by ${source === 'checking' ? 'Checking Department' : 'Finance Department'}`,
      data: {
        application: rejectedApp,
        reason: remarks,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/finance-approve
 * ⭐ CRITICAL: Finance approval - Auto-creates 7-day booking
 * This is the most important endpoint - it triggers automatic blogger booking
 */
router.post('/:id/finance-approve', requireRole(['finance']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { approvedBudget, remarks } = req.body;
    const approvedBy = req.user.id;

    // Validate input
    if (!approvedBudget || approvedBudget <= 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Approved budget is required and must be positive',
        },
      });
    }

    // Verify application exists
    const appResult = await pool.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
    }

    const app = appResult.rows[0];

    // Verify application is in correct state
    if (app.checking_status !== 'approved') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Application must be approved by Checking Department first',
          currentStatus: app.checking_status,
        },
      });
    }

    if (app.finance_status !== 'pending') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: `Cannot approve application. Finance status: ${app.finance_status}`,
        },
      });
    }

    // ⭐ CRITICAL: Call service that auto-creates 7-day booking
    const result = await applicationService.approveByFinance(
      id,
      approvedBy,
      approvedBudget,
      remarks || ''
    );

    res.json({
      success: true,
      message: 'Application approved by Finance with automatic 7-day booking created',
      data: {
        application: result.application,
        booking: {
          id: result.booking.id,
          bloggerId: result.booking.bloggerId,
          bookedBy: result.booking.bookedBy,
          bookedUntil: result.booking.bookedUntil.toISOString(),
          daysRemaining: result.booking.daysRemaining,
          status: 'active',
        },
        approvedBudget,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/escalate
 * Escalate rejected application to Team Leader for recheck
 */
router.post('/:id/escalate', requireRole(['checking']), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, teamLeaderId } = req.body;
    const escalatedBy = req.user.id;

    if (!reason || !teamLeaderId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Escalation reason and Team Leader ID are required',
        },
      });
    }

    // Verify application exists
    const appResult = await pool.query(
      `SELECT * FROM applications WHERE id = $1`,
      [id]
    );

    if (appResult.rows.length === 0) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Application not found',
        },
      });
    }

    const app = appResult.rows[0];

    // Verify application is rejected
    if (app.checking_status !== 'rejected') {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Only rejected applications can be escalated',
          currentStatus: app.checking_status,
        },
      });
    }

    // Call service to escalate
    const escalation = await applicationService.escalateToTeamLeader(
      id,
      escalatedBy,
      reason,
      teamLeaderId
    );

    res.json({
      success: true,
      message: 'Application escalated to Team Leader for recheck',
      data: {
        applicationId: escalation.applicationId,
        recheckId: escalation.recheckId,
        status: escalation.status,
        reason,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/applications/:id/recheck-justification
 * Team Leader submits justification for rechecked application
 */
router.post('/recheck/:recheckId/justification', requireRole(['team-leader']), async (req, res, next) => {
  try {
    const { recheckId } = req.params;
    const { justification } = req.body;
    const teamLeaderId = req.user.id;

    if (!justification || justification.trim().length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Justification is required',
        },
      });
    }

    // Call service to submit justification
    const updatedRecheck = await applicationService.submitRecheckJustification(
      recheckId,
      justification,
      teamLeaderId
    );

    res.json({
      success: true,
      message: 'Recheck justification submitted successfully',
      data: {
        recheckId: updatedRecheck.id,
        status: updatedRecheck.status,
        originalApplicationId: updatedRecheck.original_application_id,
        submittedAt: updatedRecheck.submitted_by_team_leader_at,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
