/**
 * Application Service
 * Handles application workflow: submit → checking → finance → approved/rejected
 * Includes team leader recheck workflow
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const bookingService = require('./booking');

/**
 * Calculate eligibility status based on cooperation history
 */
async function calculateEligibility(bloggerId) {
  try {
    const result = await pool.query(
      `SELECT
        cooperation_count,
        last_cooperation,
        blacklisted,
        blacklist_expiry
       FROM bloggers
       WHERE uid = $1`,
      [bloggerId]
    );

    if (result.rows.length === 0) {
      throw new Error('Blogger not found');
    }

    const blogger = result.rows[0];

    // Check if blacklisted
    if (blogger.blacklisted) {
      // Check if blacklist has expired
      if (blogger.blacklist_expiry && new Date(blogger.blacklist_expiry) < new Date()) {
        return { status: 'eligible', reason: 'Blacklist expired' };
      }
      return { status: 'blacklisted', reason: 'Blogger is on blacklist' };
    }

    // Check waiting period
    if (blogger.cooperation_count > 0 && blogger.last_cooperation) {
      const lastCoop = new Date(blogger.last_cooperation);
      const daysSince = Math.floor((new Date() - lastCoop) / (1000 * 60 * 60 * 24));
      const waitingPeriod = 60; // 60 days

      if (daysSince < waitingPeriod) {
        const daysRemaining = waitingPeriod - daysSince;
        return {
          status: 'waiting-period',
          reason: `Only ${daysSince} days since last cooperation. Waiting period is ${waitingPeriod} days. ${daysRemaining} days remaining.`,
        };
      }
    }

    return { status: 'eligible', reason: 'No restrictions' };
  } catch (error) {
    logger.error('Failed to calculate eligibility', {
      bloggerId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Approve application by Checking Department
 */
async function approveByChecking(applicationId, checkedBy, remarks = '') {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE applications SET
        checking_status = 'approved',
        checked_by = $1,
        checked_at = NOW(),
        checking_remarks = $2,
        updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [checkedBy, remarks, applicationId]
    );

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    await client.query('COMMIT');

    const app = result.rows[0];
    logger.audit('APPLICATION_APPROVED_CHECKING', 'application', applicationId, checkedBy, {
      bloggerId: app.blogger_uid,
      staffId: app.staff_id,
    });

    return app;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Reject application
 */
async function rejectApplication(applicationId, rejectedBy, remarks, source = 'checking') {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const statusField = source === 'checking' ? 'checking_status' : 'finance_status';
    const remarksField = source === 'checking' ? 'checking_remarks' : 'finance_remarks';
    const byField = source === 'checking' ? 'checked_by' : 'approved_by_finance';
    const atField = source === 'checking' ? 'checked_at' : 'approved_at';

    const updateQuery = `UPDATE applications SET
      ${statusField} = 'rejected',
      ${remarksField} = $1,
      ${byField} = $2,
      ${atField} = NOW(),
      final_result = 'rejected',
      updated_at = NOW()
     WHERE id = $3
     RETURNING *`;

    const result = await client.query(updateQuery, [remarks, rejectedBy, applicationId]);

    if (result.rows.length === 0) {
      throw new Error('Application not found');
    }

    await client.query('COMMIT');

    const app = result.rows[0];
    logger.audit('APPLICATION_REJECTED', 'application', applicationId, rejectedBy, {
      bloggerId: app.blogger_uid,
      source,
      remarks,
    });

    return app;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * CRITICAL: Finance approves AND creates 7-day booking
 * This is the most important function - triggers automatic booking
 */
async function approveByFinance(applicationId, approvedBy, approvedBudget, remarks = '') {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get application details
    const appResult = await client.query(
      `SELECT * FROM applications WHERE id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    const app = appResult.rows[0];

    // Update application
    const updateResult = await client.query(
      `UPDATE applications SET
        finance_status = 'approved',
        final_result = 'approved',
        approved_budget = $1,
        approved_by_finance = $2,
        approved_at = NOW(),
        finance_remarks = $3,
        updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [approvedBudget, approvedBy, remarks, applicationId]
    );

    // ⭐ AUTO-CREATE 7-DAY BOOKING ⭐
    // This is the critical part - automatically book blogger for 7 days
    const bookingId = uuidv4();
    const bookedUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await client.query(
      `INSERT INTO blogger_bookings (
        id, blogger_uid, booked_by_staff_id, booked_by_staff_name,
        application_id, booked_until, status
      ) VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
      [
        bookingId,
        app.blogger_uid,
        app.staff_id,
        app.staff_name,
        applicationId,
        bookedUntil,
      ]
    );

    // Update blogger with booking info
    await client.query(
      `UPDATE bloggers SET
        booked_status = 'booked',
        booked_by_staff_id = $1,
        booked_by_staff_name = $2,
        booked_until = $3,
        booking_id = $4
       WHERE uid = $5`,
      [app.staff_id, app.staff_name, bookedUntil, bookingId, app.blogger_uid]
    );

    // Update application with booking reference
    await client.query(
      `UPDATE applications SET
        booking_id = $1,
        booked_by_name = $2
       WHERE id = $3`,
      [bookingId, app.staff_name, applicationId]
    );

    await client.query('COMMIT');

    logger.audit('APPLICATION_APPROVED_FINANCE', 'application', applicationId, approvedBy, {
      bloggerId: app.blogger_uid,
      staffName: app.staff_name,
      approvedBudget,
      bookingCreated: true,
      bookingId,
      bookedUntil: bookedUntil.toISOString(),
    });

    return {
      application: updateResult.rows[0],
      booking: {
        id: bookingId,
        bloggerId: app.blogger_uid,
        bookedBy: app.staff_name,
        bookedUntil,
        daysRemaining: 7,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to approve by finance', {
      applicationId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Escalate to Team Leader for recheck
 */
async function escalateToTeamLeader(applicationId, escalatedBy, reason, teamLeaderId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get application
    const appResult = await client.query(
      `SELECT * FROM applications WHERE id = $1`,
      [applicationId]
    );

    if (appResult.rows.length === 0) {
      throw new Error('Application not found');
    }

    const app = appResult.rows[0];

    // Update application as escalated
    await client.query(
      `UPDATE applications SET
        escalated_to_team_leader = true,
        escalated_at = NOW(),
        escalation_reason = $1,
        updated_at = NOW()
       WHERE id = $2`,
      [reason, applicationId]
    );

    // Create recheck request
    const recheckId = `REC-${String(Math.random()).slice(2, 6)}`;
    await client.query(
      `INSERT INTO team_leader_rechecks (
        id, original_application_id, blogger_uid, staff_id, team_leader_id,
        original_rejection_reason, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'awaiting-justification', NOW(), NOW())`,
      [
        recheckId,
        applicationId,
        app.blogger_uid,
        app.staff_id,
        teamLeaderId,
        reason,
      ]
    );

    await client.query('COMMIT');

    logger.audit('APPLICATION_ESCALATED', 'application', applicationId, escalatedBy, {
      bloggerId: app.blogger_uid,
      recheckId,
      teamLeaderId,
    });

    return {
      applicationId,
      recheckId,
      status: 'escalated',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Submit recheck justification from Team Leader
 */
async function submitRecheckJustification(recheckId, justification, teamLeaderId) {
  try {
    const result = await pool.query(
      `UPDATE team_leader_rechecks SET
        recheck_justification = $1,
        submitted_by_team_leader_at = NOW(),
        status = 'submitted',
        updated_at = NOW()
       WHERE id = $1 AND team_leader_id = $2
       RETURNING *`,
      [recheckId, justification, teamLeaderId]
    );

    if (result.rows.length === 0) {
      throw new Error('Recheck request not found');
    }

    logger.audit('RECHECK_SUBMITTED', 'recheck', recheckId, teamLeaderId, {
      justificationLength: justification.length,
    });

    return result.rows[0];
  } catch (error) {
    logger.error('Failed to submit recheck', {
      recheckId,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  calculateEligibility,
  approveByChecking,
  rejectApplication,
  approveByFinance,
  escalateToTeamLeader,
  submitRecheckJustification,
};
