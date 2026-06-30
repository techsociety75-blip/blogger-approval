# Developer Quick Start Guide
## Blogger Cooperation Approval & Budget Management System

---

## 🚀 Quick Setup (5 minutes)

### 1. Clone Repository
```bash
git clone <repo-url>
cd blogger-approval-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 4. Setup Database
```bash
npm run migrate
npm run seed
```

### 5. Start Server
```bash
npm run dev
```

Server runs on `http://localhost:3000`

---

## 📁 Project Structure

```
src/
├── app.js                          Main Express server
├── config/
│   └── database.js                 Vercel Postgres connection
├── database/
│   ├── schema.sql                  Database schema
│   ├── runMigrations.js            Schema executor
│   └── seed.js                     Demo data
├── api/
│   ├── routes/                     API endpoints
│   │   ├── auth.js                 Login/auth
│   │   ├── bloggers.js             Search & details
│   │   ├── applications.js         ⭐ Application workflow
│   │   ├── bookings.js             ⭐ 7-day booking system
│   │   ├── admin.js                Admin operations
│   │   └── reports.js              Analytics
│   └── middleware/
│       ├── auth.js                 JWT verification & RBAC
│       ├── errorHandler.js         Global error handling
│       └── requestLogger.js        HTTP logging
├── services/
│   ├── application.js              ⭐ Application workflow logic
│   ├── booking.js                  ⭐ 7-day booking logic
│   ├── googleSheets.js             (Phase 2)
│   ├── search.js                   (Phase 3)
│   ├── audit.js                    (Phase 5)
│   └── notifications.js            (Phase 5)
├── jobs/
│   ├── bookingExpiry.js            Auto-expire bookings
│   ├── googleSheetSync.js          (Phase 2)
│   └── auditCleanup.js             (Phase 5)
├── utils/
│   ├── logger.js                   Logging utility
│   └── validators.js               Input validation
└── tests/
    ├── unit/                       Unit tests
    ├── integration/                Integration tests
    │   └── booking-workflow.test.js Complete workflow test
    ├── security/                   Security tests
    └── performance/                Performance tests
```

---

## 🔑 Key Concepts

### 1. Five-Role Workflow

| Role | Can Do | Cannot Do |
|------|--------|----------|
| **Admin** | Everything | Create accounts (use signup form) |
| **Staff** | Submit applications, check bookings | Approve or reject |
| **Checking** | Approve/reject applications | Access finance functions |
| **Finance** | Approve with budget, create bookings | Check personal applications |
| **Team Leader** | Recheck rejected applications | Approve independently |

### 2. The 7-Day Booking System

When Finance approves an application:
1. Booking is **AUTOMATICALLY** created for 7 days
2. Blogger is locked to the approving staff member
3. Other staff **CANNOT** submit applications for that blogger
4. Same staff CAN continue to submit (has booking)
5. After 7 days or admin cancellation, blogger is released

```
Finance Approves → 7-Day Booking Created → Blogger Locked → 7 Days Later → Blogger Released
```

### 3. Database Transactions

Critical operations use transactions (all-or-nothing):

```javascript
const client = await pool.connect();
try {
  await client.query('BEGIN');
  // Multiple operations
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
} finally {
  client.release();
}
```

Examples:
- Application approval (multiple updates)
- Booking creation (updates 3 tables)
- Booking cancellation (updates 2 tables)

---

## 🧪 Running Tests

### Test Booking Workflow (Recommended First Test)
```bash
npm run test:booking-workflow
```

This tests the complete flow:
1. Submit application
2. Checking approves
3. Finance approves (auto-creates booking)
4. Booking blocks other staff
5. Admin extends/cancels booking

### Run All Tests
```bash
npm test
```

### Run Specific Test Type
```bash
npm run test:security
npm run test:performance
```

---

## 📚 Understanding the Code

### Service Functions

Services contain business logic, not HTTP handling.

**application.js:**
```javascript
// Check if blogger is eligible
await applicationService.calculateEligibility(bloggerId)

// Checking Department approves
await applicationService.approveByChecking(appId, checkedBy, remarks)

// ⭐ Finance approves AND creates booking
const result = await applicationService.approveByFinance(appId, approvedBy, budget, remarks)
// result = { application: {...}, booking: {...} }

// Reject application
await applicationService.rejectApplication(appId, rejectedBy, remarks, source)

// Escalate to Team Leader
await applicationService.escalateToTeamLeader(appId, escalatedBy, reason, teamLeaderId)
```

**booking.js:**
```javascript
// Create 7-day booking
await bookingService.createBooking(bloggerId, staffId, staffName, appId)

// Check if can submit (booking block)
const status = await bookingService.checkBookingStatus(bloggerId, userId)
// Returns: { bookerStatus, canSubmit, blockReason, booking }

// Extend or cancel
await bookingService.extendBooking(bookingId, daysToAdd, adminId)
await bookingService.cancelBooking(bookingId, reason, adminId)

// Scheduled job to auto-expire
await bookingService.autoExpireBookings()
```

### Route Handlers

Routes handle HTTP requests and call services.

**Pattern:**
```javascript
router.post('/:id/finance-approve', requireRole(['finance']), async (req, res, next) => {
  try {
    // 1. Extract and validate input
    const { approvedBudget, remarks } = req.body;
    const approvedBy = req.user.id;

    // 2. Verify state
    const app = await pool.query(...);
    if (app.checking_status !== 'approved') {
      return res.status(409).json({
        error: { code: 'INVALID_STATE', message: '...' }
      });
    }

    // 3. Call service
    const result = await applicationService.approveByFinance(
      id, approvedBy, approvedBudget, remarks
    );

    // 4. Return success
    res.json({
      success: true,
      message: '...',
      data: result
    });
  } catch (error) {
    next(error);  // Error handler catches
  }
});
```

### Middleware

**auth.js** - JWT verification and RBAC:
```javascript
// Extract and verify JWT token
const user = verifyToken(req.headers.authorization);
req.user = user;  // Available in all route handlers

// Require specific roles
router.post('/:id/approve', requireRole(['checking']), async (req, res) => {
  // Only checking staff can access
});
```

**errorHandler.js** - Centralized error handling:
```javascript
// Catches all errors and returns proper response
app.use((error, req, res, next) => {
  // Determines status code, logs error, returns JSON
  res.status(statusCode).json({
    error: { code: 'ERROR_TYPE', message: '...' }
  });
});
```

---

## 🔍 Debugging Tips

### 1. Enable Debug Logging
```bash
LOG_LEVEL=debug npm run dev
```

### 2. Check Database Directly
```bash
psql <DATABASE_URL>

-- See active bookings
SELECT * FROM active_bookings WHERE status = 'active';

-- See application workflow
SELECT id, checking_status, finance_status FROM applications;

-- Check blogger booking
SELECT booked_status, booked_by_staff_name, booked_until FROM bloggers WHERE uid = 'blogger-001';
```

### 3. Test Endpoints with curl
```bash
# Login
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "hina.tariq", "password": "DemoPassword123!"}' \
  | jq -r '.data.tokens.accessToken')

# Search blogger
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/bloggers?q=aisha" | jq

# Check booking status
curl -s -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/bloggers/blogger-001/booking-status" | jq
```

### 4. Monitor Logs
```bash
# Real-time logs
tail -f logs/app.log

# Just errors
tail -f logs/error.log

# Just audit trail
tail -f logs/audit.log
```

---

## 🛠️ Making Changes

### Adding New Endpoint

1. **Create route handler** in `src/api/routes/[resource].js`:
```javascript
router.post('/new-endpoint', requireRole(['role']), async (req, res, next) => {
  try {
    const { param } = req.body;
    const result = await service.doSomething(param);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
```

2. **Mount route** in `src/app.js`:
```javascript
app.use('/api/resource', require('./api/routes/resource'));
```

3. **Test with curl**:
```bash
curl -X POST http://localhost:3000/api/resource/new-endpoint \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"param": "value"}'
```

### Adding New Service Function

1. **Create function** in `src/services/[service].js`:
```javascript
async function newFunction(params) {
  try {
    // Validate
    if (!params) throw new Error('Params required');

    // Execute
    const result = await pool.query(...);

    // Log
    logger.audit('FUNCTION_NAME', 'entity', id, userId, { details });

    return result.rows[0];
  } catch (error) {
    logger.error('Function failed', { error: error.message });
    throw error;
  }
}
```

2. **Export function**:
```javascript
module.exports = {
  existingFunction,
  newFunction
};
```

3. **Import and use** in route handler:
```javascript
const { newFunction } = require('../../services/service');
const result = await newFunction(params);
```

---

## 📋 Common Commands

```bash
# Development
npm run dev                           # Start with auto-reload
npm run lint                          # Check code style
npm run format                        # Auto-format code

# Database
npm run migrate                       # Create schema
npm run seed                          # Add demo data

# Testing
npm test                              # Run all tests
npm run test:booking-workflow         # Workflow test
npm run test:security                 # Security tests

# Jobs
npm run jobs:booking-expiry           # Run expiry job

# Maintenance
npm run sync:sheets                   # Google Sheets sync
```

---

## 🐛 Common Issues

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solution:** Check DATABASE_URL in .env

### JWT Token Expired
```
Error: jwt expired
```
**Solution:** Use POST /api/auth/refresh with refreshToken

### Booking Not Created
```
Application approved but no booking found
```
**Solution:** Check if Finance approval endpoint is being used, not just application approve

### Staff Can't Submit
```
Trying to submit but getting CONFLICT error
```
**Solution:** Check booking status with GET /api/bloggers/:uid/booking-status

---

## 📖 Documentation

- **API_DOCUMENTATION.md** - Complete API reference with curl examples
- **PHASE_4_COMPLETION.md** - Phase 4 implementation details
- **README.md** - Project overview and setup
- **WORKFLOW_CHART.html** - Visual workflow diagrams (from prototype)

---

## 🚀 Next Steps

1. **Run the workflow test** - Understand the complete flow
2. **Make a test API call** - Get familiar with endpoints
3. **Read API_DOCUMENTATION.md** - Understand available endpoints
4. **Check database schema** - Understand data model
5. **Look at service functions** - Understand business logic

---

## 📞 Quick Reference

| Need | File | Function |
|------|------|----------|
| Workflow logic | `src/services/application.js` | `approveByFinance()` |
| Booking logic | `src/services/booking.js` | `checkBookingStatus()` |
| Application routes | `src/api/routes/applications.js` | Various endpoints |
| Booking routes | `src/api/routes/bookings.js` | Various endpoints |
| Authentication | `src/api/middleware/auth.js` | `verifyToken()`, `requireRole()` |
| Errors | `src/api/middleware/errorHandler.js` | Global handler |
| Logging | `src/utils/logger.js` | `logger.info()`, `logger.audit()` |
| Database | `src/config/database.js` | Connection pool |

---

## ✅ You're Ready!

You now have everything needed to:
- ✅ Understand the architecture
- ✅ Make changes and additions
- ✅ Test your changes
- ✅ Deploy to production

**Happy coding! 🎉**
