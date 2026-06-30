/**
 * Reports Service
 * Handles analytics, dashboards, and data export
 * PHASE 5
 */

const pool = require('../config/database');
const logger = require('../utils/logger');

/**
 * Get role-specific dashboard stats
 */
async function getRoleDashboard(userId, role) {
  try {
    if (role === 'admin') {
      return getAdminDashboard();
    } else if (role === 'staff') {
      return getStaffDashboard(userId);
    } else if (role === 'checking') {
      return getCheckingDashboard();
    } else if (role === 'finance') {
      return getFinanceDashboard();
    } else if (role === 'team-leader') {
      return getTeamLeaderDashboard(userId);
    }
  } catch (error) {
    logger.error('Failed to get role dashboard', {
      userId,
      role,
      error: error.message,
    });
    throw error;
  }
}

async function getAdminDashboard() {
  const [usersResult, bloggersResult, appsResult, bookingsResult] = await Promise.all([
    pool.query('SELECT COUNT(*) as count FROM users'),
    pool.query('SELECT COUNT(*) as count FROM bloggers'),
    pool.query('SELECT COUNT(*) as count FROM applications'),
    pool.query('SELECT COUNT(*) as count FROM blogger_bookings WHERE status = \'active\''),
  ]);

  return {
    role: 'admin',
    totalUsers: parseInt(usersResult.rows[0].count),
    totalBloggers: parseInt(bloggersResult.rows[0].count),
    totalApplications: parseInt(appsResult.rows[0].count),
    activeBookings: parseInt(bookingsResult.rows[0].count),
  };
}

async function getStaffDashboard(userId) {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_submitted,
      SUM(CASE WHEN final_result = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN final_result = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN final_result = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(approved_budget) as total_budget_approved
     FROM applications
     WHERE staff_id = $1`,
    [userId]
  );

  const stats = result.rows[0];
  return {
    role: 'staff',
    totalSubmitted: parseInt(stats.total_submitted) || 0,
    approved: parseInt(stats.approved) || 0,
    rejected: parseInt(stats.rejected) || 0,
    pending: parseInt(stats.pending) || 0,
    totalBudgetApproved: parseFloat(stats.total_budget_approved) || 0,
  };
}

async function getCheckingDashboard() {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_reviewed,
      SUM(CASE WHEN checking_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN checking_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN checking_status = 'pending' THEN 1 ELSE 0 END) as pending
     FROM applications`
  );

  const stats = result.rows[0];
  return {
    role: 'checking',
    totalReviewed: parseInt(stats.total_reviewed) || 0,
    approved: parseInt(stats.approved) || 0,
    rejected: parseInt(stats.rejected) || 0,
    pending: parseInt(stats.pending) || 0,
  };
}

async function getFinanceDashboard() {
  const result = await pool.query(
    `SELECT
      COUNT(*) as total_reviewed,
      SUM(CASE WHEN finance_status = 'approved' THEN 1 ELSE 0 END) as approved,
      SUM(CASE WHEN finance_status = 'rejected' THEN 1 ELSE 0 END) as rejected,
      SUM(CASE WHEN finance_status = 'pending' THEN 1 ELSE 0 END) as pending,
      SUM(approved_budget) as total_budget_approved,
      COUNT(DISTINCT booking_id) as total_bookings
     FROM applications`
  );

  const stats = result.rows[0];
  return {
    role: 'finance',
    totalReviewed: parseInt(stats.total_reviewed) || 0,
    approved: parseInt(stats.approved) || 0,
    rejected: parseInt(stats.rejected) || 0,
    pending: parseInt(stats.pending) || 0,
    totalBudgetApproved: parseFloat(stats.total_budget_approved) || 0,
    totalBookingsCreated: parseInt(stats.total_bookings) || 0,
  };
}

async function getTeamLeaderDashboard(userId) {
  const result = await pool.query(
    `SELECT
      (SELECT COUNT(*) FROM team_leader_rechecks WHERE team_leader_id = $1) as rechecks,
      (SELECT COUNT(*) FROM team_leader_rechecks WHERE team_leader_id = $1 AND status = 'submitted') as rechecks_submitted,
      (SELECT COUNT(*) FROM team_leader_rechecks WHERE team_leader_id = $1 AND status = 'awaiting-justification') as rechecks_pending
     FROM users
     WHERE id = $1`,
    [userId]
  );

  const stats = result.rows[0];
  return {
    role: 'team-leader',
    totalRechecks: parseInt(stats.rechecks) || 0,
    rechecksPending: parseInt(stats.rechecks_pending) || 0,
    rechecksSubmitted: parseInt(stats.rechecks_submitted) || 0,
  };
}

/**
 * Get application timeline data
 */
async function getApplicationTimeline(days = 30) {
  try {
    const result = await pool.query(
      `SELECT
        DATE(submitted_at) as date,
        COUNT(*) as submitted,
        SUM(CASE WHEN final_result = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN final_result = 'rejected' THEN 1 ELSE 0 END) as rejected
       FROM applications
       WHERE submitted_at >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE(submitted_at)
       ORDER BY date DESC`
    );

    return result.rows.map(row => ({
      date: row.date,
      submitted: parseInt(row.submitted),
      approved: parseInt(row.approved) || 0,
      rejected: parseInt(row.rejected) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get application timeline', {
      days,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get blogger performance report
 */
async function getBloggerPerformanceReport() {
  try {
    const result = await pool.query(
      `SELECT
        b.uid,
        b.name,
        b.username,
        b.followers,
        b.category,
        COUNT(a.id) as total_cooperations,
        SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as successful_cooperations,
        SUM(CASE WHEN a.final_result = 'rejected' THEN 1 ELSE 0 END) as rejected_cooperations,
        b.cooperation_count as total_history,
        b.blacklisted
       FROM bloggers b
       LEFT JOIN applications a ON b.uid = a.blogger_uid
       GROUP BY b.uid, b.name, b.username, b.followers, b.category, b.cooperation_count, b.blacklisted
       ORDER BY total_cooperations DESC
       LIMIT 100`
    );

    return result.rows.map(row => ({
      bloggerId: row.uid,
      name: row.name,
      username: row.username,
      followers: parseInt(row.followers),
      category: row.category,
      totalCooperations: parseInt(row.total_cooperations) || 0,
      successfulCooperations: parseInt(row.successful_cooperations) || 0,
      rejectedCooperations: parseInt(row.rejected_cooperations) || 0,
      totalHistory: parseInt(row.total_history) || 0,
      blacklisted: row.blacklisted,
    }));
  } catch (error) {
    logger.error('Failed to get blogger performance report', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get budget utilization report
 */
async function getBudgetUtilizationReport() {
  try {
    const result = await pool.query(
      `SELECT
        t.id,
        t.name,
        t.monthly_budget,
        t.used_budget,
        (t.monthly_budget - COALESCE(t.used_budget, 0)) as remaining_budget,
        ROUND(((COALESCE(t.used_budget, 0) / t.monthly_budget) * 100)::NUMERIC, 2) as utilization_percent,
        COUNT(a.id) as total_applications,
        SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as approved_applications
       FROM teams t
       LEFT JOIN applications a ON t.id = a.team_id
       GROUP BY t.id, t.name, t.monthly_budget, t.used_budget
       ORDER BY utilization_percent DESC`
    );

    return result.rows.map(row => ({
      teamId: row.id,
      teamName: row.name,
      monthlyBudget: parseFloat(row.monthly_budget),
      usedBudget: parseFloat(row.used_budget) || 0,
      remainingBudget: parseFloat(row.remaining_budget),
      utilizationPercent: parseFloat(row.utilization_percent),
      totalApplications: parseInt(row.total_applications) || 0,
      approvedApplications: parseInt(row.approved_applications) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get budget utilization report', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Export data (CSV format)
 */
async function exportData(dataType) {
  try {
    let query;
    let filename;

    if (dataType === 'applications') {
      query = 'SELECT * FROM applications ORDER BY submitted_at DESC';
      filename = 'applications.csv';
    } else if (dataType === 'bookings') {
      query = 'SELECT * FROM blogger_bookings ORDER BY created_at DESC';
      filename = 'bookings.csv';
    } else if (dataType === 'bloggers') {
      query = 'SELECT * FROM bloggers ORDER BY created_at DESC';
      filename = 'bloggers.csv';
    } else if (dataType === 'users') {
      query = 'SELECT id, username, email, role, first_name, last_name, created_at FROM users ORDER BY created_at DESC';
      filename = 'users.csv';
    } else {
      throw new Error('Invalid data type');
    }

    const result = await pool.query(query);

    if (result.rows.length === 0) {
      return {
        filename,
        data: '',
        count: 0,
      };
    }

    // Convert to CSV
    const headers = Object.keys(result.rows[0]);
    const csv = [
      headers.join(','),
      ...result.rows.map(row =>
        headers.map(header => {
          const value = row[header];
          if (value === null) return '';
          if (typeof value === 'string' && value.includes(',')) {
            return `"${value}"`;
          }
          return value;
        }).join(',')
      ),
    ].join('\n');

    logger.audit('DATA_EXPORTED', 'export', dataType, 'admin', {
      dataType,
      count: result.rows.length,
      filename,
    });

    return {
      filename,
      data: csv,
      count: result.rows.length,
    };
  } catch (error) {
    logger.error('Failed to export data', {
      dataType,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getRoleDashboard,
  getApplicationTimeline,
  getBloggerPerformanceReport,
  getBudgetUtilizationReport,
  exportData,
};
