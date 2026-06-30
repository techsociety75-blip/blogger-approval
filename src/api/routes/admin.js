/**
 * Admin Routes (Admin role only)
 * PHASE 5 - Admin Dashboard & User Management
 *
 * Dashboard:
 * GET /api/admin/dashboard - System overview
 *
 * User Management:
 * GET /api/admin/users - List all users
 * POST /api/admin/users - Create user
 * PUT /api/admin/users/:id - Update user
 * DELETE /api/admin/users/:id - Delete user
 *
 * Team Management:
 * GET /api/admin/teams - List all teams
 * POST /api/admin/teams - Create team
 * PUT /api/admin/teams/:id - Update team
 *
 * Reports & Analytics:
 * GET /api/admin/stats/applications - Application statistics
 * GET /api/admin/stats/team-performance - Team performance
 * GET /api/admin/stats/staff-performance - Staff performance
 *
 * Audit & Monitoring:
 * GET /api/admin/audit-logs - View audit trail
 * GET /api/admin/bookings - Manage all bookings
 * GET /api/admin/blacklist - View blacklisted bloggers
 */

const express = require('express');
const router = express.Router();
const logger = require('../../utils/logger');
const adminService = require('../../services/admin');
const { requireRole } = require('../middleware/auth');

// All admin routes require admin role
router.use(requireRole(['admin']));

/**
 * GET /api/admin/dashboard
 * System overview with key metrics
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const overview = await adminService.getDashboardOverview();

    res.json({
      success: true,
      data: {
        system: {
          status: 'operational',
          uptime: process.uptime(),
        },
        overview,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/users
 * List all users (optional filtering by role)
 */
router.get('/users', async (req, res, next) => {
  try {
    const { role, teamId } = req.query;

    const users = await adminService.getAllUsers(role, teamId);

    res.json({
      success: true,
      data: {
        users,
        count: users.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/users
 * Create new user
 */
router.post('/users', async (req, res, next) => {
  try {
    const { username, email, password, role, firstName, lastName, teamId } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: username, email, password, role',
        },
      });
    }

    const user = await adminService.createUser({
      username,
      email,
      password,
      role,
      firstName,
      lastName,
      teamId,
    });

    logger.audit('ADMIN_USER_CREATED', 'user', user.id, req.user.id, {
      username: user.username,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/users/:id
 * Update user
 */
router.put('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, teamId, role } = req.body;

    const user = await adminService.updateUser(id, {
      email,
      firstName,
      lastName,
      teamId,
      role,
    });

    logger.audit('ADMIN_USER_UPDATED', 'user', id, req.user.id, {
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/admin/users/:id
 * Delete user
 */
router.delete('/users/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (id === req.user.id) {
      return res.status(409).json({
        error: {
          code: 'INVALID_STATE',
          message: 'Cannot delete your own account',
        },
      });
    }

    const result = await adminService.deleteUser(id);

    logger.audit('ADMIN_USER_DELETED', 'user', id, req.user.id, {
      action: 'user_deletion',
    });

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/teams
 * List all teams
 */
router.get('/teams', async (req, res, next) => {
  try {
    const teams = await adminService.getAllTeams();

    res.json({
      success: true,
      data: {
        teams,
        count: teams.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/admin/teams
 * Create new team
 */
router.post('/teams', async (req, res, next) => {
  try {
    const { name, leadId, monthlyBudget } = req.body;

    if (!name || !monthlyBudget) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: name, monthlyBudget',
        },
      });
    }

    const team = await adminService.createTeam({
      name,
      leadId,
      monthlyBudget,
    });

    logger.audit('ADMIN_TEAM_CREATED', 'team', team.id, req.user.id, {
      name: team.name,
      budget: team.monthlyBudget,
    });

    res.status(201).json({
      success: true,
      message: 'Team created successfully',
      data: team,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/admin/teams/:id
 * Update team
 */
router.put('/teams/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, leadId, monthlyBudget } = req.body;

    const team = await adminService.updateTeam(id, {
      name,
      leadId,
      monthlyBudget,
    });

    logger.audit('ADMIN_TEAM_UPDATED', 'team', id, req.user.id, {
      changes: Object.keys(req.body),
    });

    res.json({
      success: true,
      message: 'Team updated successfully',
      data: team,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats/applications
 * Application statistics
 */
router.get('/stats/applications', async (req, res, next) => {
  try {
    const stats = await adminService.getApplicationStats();

    res.json({
      success: true,
      data: {
        applicationStats: stats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats/team-performance
 * Team performance analytics
 */
router.get('/stats/team-performance', async (req, res, next) => {
  try {
    const performance = await adminService.getTeamPerformance();

    res.json({
      success: true,
      data: {
        teamPerformance: performance,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/stats/staff-performance
 * Staff performance analytics
 */
router.get('/stats/staff-performance', async (req, res, next) => {
  try {
    const performance = await adminService.getStaffPerformance();

    res.json({
      success: true,
      data: {
        staffPerformance: performance,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/audit-logs
 * View audit trail
 */
router.get('/audit-logs', async (req, res, next) => {
  try {
    const { limit = 100, offset = 0 } = req.query;

    const result = await adminService.getAuditLogs(parseInt(limit), parseInt(offset));

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/bookings
 * View all bookings (admin can see all)
 */
router.get('/bookings', async (req, res, next) => {
  try {
    const { status = 'active' } = req.query;

    const result = await pool.query(
      `SELECT * FROM blogger_bookings WHERE status = $1 ORDER BY booked_until DESC`,
      [status]
    );

    res.json({
      success: true,
      data: {
        bookings: result.rows,
        count: result.rows.length,
        status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/admin/blacklist
 * View blacklisted bloggers
 */
router.get('/blacklist', async (req, res, next) => {
  try {
    const pool = require('../../config/database');

    const result = await pool.query(
      `SELECT uid, name, username, blacklist_reason, blacklist_date, blacklist_expiry
       FROM bloggers WHERE blacklisted = true ORDER BY blacklist_date DESC`
    );

    res.json({
      success: true,
      data: {
        blacklistedBloggers: result.rows,
        count: result.rows.length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
