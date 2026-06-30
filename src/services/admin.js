/**
 * Admin Service
 * Handles admin operations: user management, team management, reporting
 * PHASE 5
 */

const pool = require('../config/database');
const logger = require('../utils/logger');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Get dashboard overview
 * Shows system statistics and key metrics
 */
async function getDashboardOverview() {
  try {
    const result = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM users) as total_users,
        (SELECT COUNT(*) FROM bloggers) as total_bloggers,
        (SELECT COUNT(*) FROM applications) as total_applications,
        (SELECT COUNT(*) FROM applications WHERE final_result = 'approved') as approved_applications,
        (SELECT COUNT(*) FROM applications WHERE final_result = 'rejected') as rejected_applications,
        (SELECT COUNT(*) FROM blogger_bookings WHERE status = 'active') as active_bookings,
        (SELECT COUNT(*) FROM bloggers WHERE blacklisted = true) as blacklisted_count,
        (SELECT SUM(used_budget) FROM teams) as total_budget_used,
        (SELECT SUM(monthly_budget) FROM teams) as total_budget_allocated`
    );

    const stats = result.rows[0];

    logger.debug('Dashboard overview retrieved', {
      totalUsers: stats.total_users,
      totalApplications: stats.total_applications,
      activeBookings: stats.active_bookings,
    });

    return {
      users: parseInt(stats.total_users),
      bloggers: parseInt(stats.total_bloggers),
      applications: {
        total: parseInt(stats.total_applications),
        approved: parseInt(stats.approved_applications),
        rejected: parseInt(stats.rejected_applications),
      },
      bookings: {
        active: parseInt(stats.active_bookings),
      },
      blacklist: {
        count: parseInt(stats.blacklisted_count),
      },
      budget: {
        allocated: parseFloat(stats.total_budget_allocated) || 0,
        used: parseFloat(stats.total_budget_used) || 0,
        remaining: (parseFloat(stats.total_budget_allocated) || 0) - (parseFloat(stats.total_budget_used) || 0),
      },
    };
  } catch (error) {
    logger.error('Failed to get dashboard overview', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get all users with optional filtering
 */
async function getAllUsers(role = null, teamId = null) {
  try {
    let query = 'SELECT id, username, email, role, first_name, last_name, team_id, created_at FROM users WHERE 1=1';
    const params = [];

    if (role) {
      query += ' AND role = $1';
      params.push(role);
    }

    if (teamId) {
      query += ` AND team_id = $${params.length + 1}`;
      params.push(teamId);
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);

    return result.rows.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      teamId: user.team_id,
      createdAt: user.created_at,
    }));
  } catch (error) {
    logger.error('Failed to get users', {
      role,
      teamId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create new user
 */
async function createUser(userData) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const { username, email, password, role, firstName, lastName, teamId } = userData;

    // Validate input
    if (!username || !email || !password || !role) {
      throw new Error('Missing required fields: username, email, password, role');
    }

    if (!['admin', 'staff', 'checking', 'finance', 'team-leader'].includes(role)) {
      throw new Error('Invalid role');
    }

    // Check if user exists
    const existsResult = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existsResult.rows.length > 0) {
      throw new Error('User with this username or email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const result = await client.query(
      `INSERT INTO users (
        id, username, email, password_hash, role, first_name, last_name, team_id, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING id, username, email, role, first_name, last_name, team_id`,
      [userId, username, email, hashedPassword, role, firstName || '', lastName || '', teamId || null]
    );

    await client.query('COMMIT');

    const user = result.rows[0];

    logger.audit('USER_CREATED', 'user', user.id, 'admin', {
      username: user.username,
      role: user.role,
      email: user.email,
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      teamId: user.team_id,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create user', {
      username: userData.username,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Update user
 */
async function updateUser(userId, updateData) {
  try {
    const { email, firstName, lastName, teamId, role } = updateData;

    let query = 'UPDATE users SET updated_at = NOW()';
    const params = [];
    let paramCount = 0;

    if (email) {
      paramCount++;
      query += `, email = $${paramCount}`;
      params.push(email);
    }

    if (firstName) {
      paramCount++;
      query += `, first_name = $${paramCount}`;
      params.push(firstName);
    }

    if (lastName) {
      paramCount++;
      query += `, last_name = $${paramCount}`;
      params.push(lastName);
    }

    if (teamId !== undefined) {
      paramCount++;
      query += `, team_id = $${paramCount}`;
      params.push(teamId || null);
    }

    if (role) {
      paramCount++;
      query += `, role = $${paramCount}`;
      params.push(role);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(userId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    const user = result.rows[0];

    logger.audit('USER_UPDATED', 'user', userId, 'admin', {
      username: user.username,
      changes: Object.keys(updateData),
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      firstName: user.first_name,
      lastName: user.last_name,
      teamId: user.team_id,
    };
  } catch (error) {
    logger.error('Failed to update user', {
      userId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Delete user
 */
async function deleteUser(userId) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get user info before deletion
    const userResult = await client.query(
      'SELECT username FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      throw new Error('User not found');
    }

    const username = userResult.rows[0].username;

    // Delete user
    await client.query('DELETE FROM users WHERE id = $1', [userId]);

    await client.query('COMMIT');

    logger.audit('USER_DELETED', 'user', userId, 'admin', {
      username,
    });

    return { id: userId, message: 'User deleted successfully' };
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to delete user', {
      userId,
      error: error.message,
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get all teams
 */
async function getAllTeams() {
  try {
    const result = await pool.query(
      `SELECT
        id, name, lead_id, monthly_budget, used_budget,
        (monthly_budget - COALESCE(used_budget, 0)) as remaining_budget,
        created_at
       FROM teams
       ORDER BY name`
    );

    return result.rows.map(team => ({
      id: team.id,
      name: team.name,
      leadId: team.lead_id,
      monthlyBudget: parseFloat(team.monthly_budget),
      usedBudget: parseFloat(team.used_budget) || 0,
      remainingBudget: parseFloat(team.remaining_budget),
      createdAt: team.created_at,
    }));
  } catch (error) {
    logger.error('Failed to get teams', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Create new team
 */
async function createTeam(teamData) {
  try {
    const { name, leadId, monthlyBudget } = teamData;

    if (!name || !monthlyBudget) {
      throw new Error('Missing required fields: name, monthlyBudget');
    }

    const teamId = uuidv4();
    const result = await pool.query(
      `INSERT INTO teams (id, name, lead_id, monthly_budget, used_budget, created_at)
       VALUES ($1, $2, $3, $4, 0, NOW())
       RETURNING *`,
      [teamId, name, leadId || null, monthlyBudget]
    );

    const team = result.rows[0];

    logger.audit('TEAM_CREATED', 'team', team.id, 'admin', {
      name: team.name,
      monthlyBudget: team.monthly_budget,
    });

    return {
      id: team.id,
      name: team.name,
      leadId: team.lead_id,
      monthlyBudget: parseFloat(team.monthly_budget),
      usedBudget: 0,
      createdAt: team.created_at,
    };
  } catch (error) {
    logger.error('Failed to create team', {
      name: teamData.name,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Update team
 */
async function updateTeam(teamId, updateData) {
  try {
    const { name, leadId, monthlyBudget } = updateData;

    let query = 'UPDATE teams SET updated_at = NOW()';
    const params = [];
    let paramCount = 0;

    if (name) {
      paramCount++;
      query += `, name = $${paramCount}`;
      params.push(name);
    }

    if (leadId !== undefined) {
      paramCount++;
      query += `, lead_id = $${paramCount}`;
      params.push(leadId || null);
    }

    if (monthlyBudget) {
      paramCount++;
      query += `, monthly_budget = $${paramCount}`;
      params.push(monthlyBudget);
    }

    paramCount++;
    query += ` WHERE id = $${paramCount} RETURNING *`;
    params.push(teamId);

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Team not found');
    }

    const team = result.rows[0];

    logger.audit('TEAM_UPDATED', 'team', teamId, 'admin', {
      name: team.name,
      changes: Object.keys(updateData),
    });

    return {
      id: team.id,
      name: team.name,
      leadId: team.lead_id,
      monthlyBudget: parseFloat(team.monthly_budget),
      usedBudget: parseFloat(team.used_budget) || 0,
      createdAt: team.created_at,
    };
  } catch (error) {
    logger.error('Failed to update team', {
      teamId,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get audit logs
 */
async function getAuditLogs(limit = 100, offset = 0) {
  try {
    const result = await pool.query(
      `SELECT * FROM audit_logs
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query('SELECT COUNT(*) as total FROM audit_logs');
    const total = parseInt(countResult.rows[0].total);

    return {
      logs: result.rows.map(log => ({
        id: log.id,
        action: log.action,
        entityType: log.entity_type,
        entityId: log.entity_id,
        userId: log.user_id,
        details: log.details,
        createdAt: log.created_at,
      })),
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error('Failed to get audit logs', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get application stats
 */
async function getApplicationStats() {
  try {
    const result = await pool.query(
      `SELECT
        checking_status,
        finance_status,
        final_result,
        COUNT(*) as count
       FROM applications
       GROUP BY checking_status, finance_status, final_result`
    );

    const stats = {
      byCheckingStatus: {},
      byFinanceStatus: {},
      byFinalResult: {},
    };

    result.rows.forEach(row => {
      stats.byCheckingStatus[row.checking_status] = (stats.byCheckingStatus[row.checking_status] || 0) + row.count;
      stats.byFinanceStatus[row.finance_status] = (stats.byFinanceStatus[row.finance_status] || 0) + row.count;
      stats.byFinalResult[row.final_result] = (stats.byFinalResult[row.final_result] || 0) + row.count;
    });

    return stats;
  } catch (error) {
    logger.error('Failed to get application stats', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get team performance stats
 */
async function getTeamPerformance() {
  try {
    const result = await pool.query(
      `SELECT
        t.id,
        t.name,
        COUNT(a.id) as total_applications,
        SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as approved_applications,
        SUM(a.approved_budget) as total_approved_budget,
        SUM(CASE WHEN b.status = 'active' THEN 1 ELSE 0 END) as active_bookings
       FROM teams t
       LEFT JOIN applications a ON t.id = a.team_id
       LEFT JOIN blogger_bookings b ON a.booking_id = b.id
       GROUP BY t.id, t.name
       ORDER BY total_applications DESC`
    );

    return result.rows.map(row => ({
      teamId: row.id,
      teamName: row.name,
      totalApplications: parseInt(row.total_applications) || 0,
      approvedApplications: parseInt(row.approved_applications) || 0,
      totalApprovedBudget: parseFloat(row.total_approved_budget) || 0,
      activeBookings: parseInt(row.active_bookings) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get team performance', {
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get staff performance stats
 */
async function getStaffPerformance() {
  try {
    const result = await pool.query(
      `SELECT
        u.id,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(a.id) as total_submitted,
        SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN a.final_result = 'rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(a.approved_budget) as total_budget_approved
       FROM users u
       LEFT JOIN applications a ON u.id = a.staff_id
       WHERE u.role = 'staff'
       GROUP BY u.id, u.username, u.first_name, u.last_name
       ORDER BY total_submitted DESC`
    );

    return result.rows.map(row => ({
      userId: row.id,
      username: row.username,
      firstName: row.first_name,
      lastName: row.last_name,
      totalSubmitted: parseInt(row.total_submitted) || 0,
      approved: parseInt(row.approved) || 0,
      rejected: parseInt(row.rejected) || 0,
      totalBudgetApproved: parseFloat(row.total_budget_approved) || 0,
    }));
  } catch (error) {
    logger.error('Failed to get staff performance', {
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  getDashboardOverview,
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  getAllTeams,
  createTeam,
  updateTeam,
  getAuditLogs,
  getApplicationStats,
  getTeamPerformance,
  getStaffPerformance,
};
