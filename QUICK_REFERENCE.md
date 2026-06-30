# Quick Reference Card
## Blogger Cooperation Approval & Budget Management System

**Print this page for your desk!**

---

## 🚀 Quick Commands

```bash
# Development
npm run dev                       Start with auto-reload
npm run test:booking-workflow     Run workflow test
npm run jobs:booking-expiry       Run expiry job

# Database
npm run migrate                   Create schema
npm run seed                      Add demo data

# Maintenance  
npm run lint                      Check code style
npm run format                    Auto-format code
```

---

## 🔐 Login (Test Users)

```bash
# Staff
Username: hina.tariq / omar.farooq
Password: DemoPassword123!

# Checking Dept
Username: bilal.aslam
Password: DemoPassword123!

# Finance
Username: sara.khan
Password: DemoPassword123!

# Team Leader
Username: usman.raza / mahnoor.iqbal
Password: DemoPassword123!

# Admin
Username: ali.ahmad
Password: DemoPassword123!
```

---

## 📡 API Endpoints (18 Total)

### 🔓 Authentication (2)
```
POST   /api/auth/login              Get access token
POST   /api/auth/refresh            Refresh token
```

### 🔍 Bloggers (3)
```
GET    /api/bloggers?q=search       Search bloggers
GET    /api/bloggers/:uid           Get details
GET    /api/bloggers/:uid/booking-status   Check booking ⭐
```

### 📋 Applications (8) ⭐
```
POST   /api/applications            Submit application ⭐
GET    /api/applications            List applications
GET    /api/applications/:id        Get single application
POST   /api/applications/:id/approve                Checking approve
POST   /api/applications/:id/reject                 Reject
POST   /api/applications/:id/finance-approve       Finance approve ⭐
POST   /api/applications/:id/escalate               Escalate
POST   /api/applications/recheck/:id/justification  Recheck
```

### 📅 Bookings (5)
```
GET    /api/bookings                List active bookings
GET    /api/bookings/:id            Get details
POST   /api/bookings/:id/extend     Extend (Admin)
POST   /api/bookings/:id/cancel     Cancel (Admin)
```

---

## 🎯 Complete Workflow

### 1️⃣ Get Token
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"hina.tariq","password":"DemoPassword123!"}'
```

### 2️⃣ Search Blogger
```bash
curl -X GET "http://localhost:3000/api/bloggers?q=aisha" \
  -H "Authorization: Bearer $TOKEN"
```

### 3️⃣ Check Booking Status
```bash
curl -X GET "http://localhost:3000/api/bloggers/blogger-001/booking-status" \
  -H "Authorization: Bearer $TOKEN"
# Returns: { canSubmit: true/false, blockReason: "..." }
```

### 4️⃣ Submit Application
```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bloggerUid":"blogger-001","campaignName":"Campaign","requestedBudget":5000}'
# Returns: REQ-0001
```

### 5️⃣ Checking Approves
```bash
# Switch to checking staff token
curl -X POST "http://localhost:3000/api/applications/REQ-0001/approve" \
  -H "Authorization: Bearer $CHECKING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks":"Approved"}'
```

### 6️⃣ Finance Approves (Auto-Creates Booking) ⭐
```bash
# Switch to finance staff token
curl -X POST "http://localhost:3000/api/applications/REQ-0001/finance-approve" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approvedBudget":5000}'
# Returns: booking object with 7-day expiry!
```

### 7️⃣ Verify Booking Block
```bash
# Try as different staff (Omar)
curl -X GET "http://localhost:3000/api/bloggers/blogger-001/booking-status" \
  -H "Authorization: Bearer $OMAR_TOKEN"
# Returns: { canSubmit: false, blockReason: "Booked by Hina Tariq..." }
```

---

## 🗂️ Project Structure

```
src/
├── app.js                          Express server
├── config/database.js              Database connection
├── services/
│   ├── application.js ⭐           Workflow logic
│   └── booking.js ⭐               Booking logic
├── api/routes/
│   ├── applications.js ⭐          8 endpoints
│   ├── bookings.js ⭐              4 endpoints
│   └── auth.js                     2 endpoints
├── api/middleware/
│   ├── auth.js                     JWT & RBAC
│   ├── errorHandler.js             Error handling
│   └── requestLogger.js            Request logging
├── jobs/
│   └── bookingExpiry.js            Auto-expire bookings
├── database/
│   ├── schema.sql                  Database schema
│   └── seed.js                     Demo data
└── utils/
    └── logger.js                   Logging utility
```

---

## 🔑 Key Concepts

### 1. Five-Role Workflow
```
Admin
├─ Manage everything

Staff
├─ Submit applications
├─ Check booking status
└─ Can't approve/reject

Checking
├─ Review applications
├─ Approve/reject
└─ Send to Finance or Team Leader

Finance
├─ Review budget
├─ Approve/reject
└─ AUTO-CREATES 7-DAY BOOKING

Team Leader
└─ Recheck rejected applications
```

### 2. The 7-Day Booking
```
When Finance approves:
↓
Booking auto-created for 7 days
↓
Blogger locked to approving staff
↓
Other staff CANNOT submit
↓
After 7 days or admin cancel:
↓
Blogger released (available again)
```

### 3. Booking Block Logic
```
Staff tries to submit for blogger
↓
Check: Is blogger booked?
├─ NO  → Allow ✓
└─ YES → Check: Same staff who booked?
   ├─ YES → Allow ✓
   └─ NO  → Block ✗
```

---

## 💾 Database Tables

| Table | Purpose |
|-------|---------|
| users | User accounts with roles |
| teams | Team management |
| bloggers | Master blogger data |
| applications | Approval workflow |
| **blogger_bookings** | ⭐ 7-day booking system |
| team_leader_rechecks | Escalation workflow |
| audit_logs | Immutable compliance trail |

---

## 🧪 Testing

```bash
# Run workflow test (8 steps)
npm run test:booking-workflow

# Expected output:
# ✅ Step 1: Staff 1 submits application
# ✅ Step 2: Checking approves
# ✅ Step 3: Finance approves (booking created)
# ✅ Step 4: Staff 2 blocked
# ✅ Step 5: Staff 1 can still submit
# ✅ Step 6: Admin extends
# ✅ Step 7: Admin cancels
# ✅ Step 8: Staff 2 can now submit
# ✅ ✅ ✅ ALL TESTS PASSED!
```

---

## ⚡ Quick Service Reference

### application.js Functions
```javascript
await applicationService.calculateEligibility(bloggerId)
await applicationService.approveByChecking(appId, checkedBy, remarks)
await applicationService.rejectApplication(appId, rejectedBy, remarks, source)
await applicationService.approveByFinance(appId, approvedBy, budget, remarks) ⭐
await applicationService.escalateToTeamLeader(appId, escalatedBy, reason, leaderId)
await applicationService.submitRecheckJustification(recheckId, justification, leaderId)
```

### booking.js Functions
```javascript
await bookingService.createBooking(bloggerId, staffId, staffName, appId)
await bookingService.checkBookingStatus(bloggerId, userId) ⭐
await bookingService.extendBooking(bookingId, daysToAdd, adminId)
await bookingService.cancelBooking(bookingId, reason, adminId)
await bookingService.autoExpireBookings()
```

---

## 🚨 Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Blogger found |
| 201 | Created | Application submitted |
| 400 | Bad request | Missing fields |
| 404 | Not found | Blogger not found |
| 409 | Conflict | Blogger booked by another |
| 401 | Unauthorized | Token invalid |
| 403 | Forbidden | Insufficient role |
| 500 | Server error | Database error |

---

## 🐛 Debugging Tips

```bash
# Check logs
tail -f logs/app.log          # All logs
tail -f logs/error.log        # Just errors
tail -f logs/audit.log        # Just audits

# Query database
psql $DATABASE_URL
SELECT * FROM active_bookings WHERE status = 'active';
SELECT * FROM applications WHERE id = 'REQ-0001';

# Enable debug logging
LOG_LEVEL=debug npm run dev

# Test endpoints
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:3000/api/bloggers?q=aisha"
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| API_DOCUMENTATION.md | Full API reference |
| DEVELOPER_GUIDE.md | Dev setup & patterns |
| PHASE_4_COMPLETION.md | Phase 4 details |
| PROJECT_STATUS.md | Overall status |
| README.md | Project overview |

---

## ✅ Checklist: Get Started

- [ ] Clone repository
- [ ] `npm install`
- [ ] `cp .env.example .env` + configure
- [ ] `npm run migrate`
- [ ] `npm run seed`
- [ ] `npm run dev`
- [ ] `npm run test:booking-workflow`
- [ ] Read API_DOCUMENTATION.md
- [ ] Try workflow with curl commands
- [ ] Read DEVELOPER_GUIDE.md

---

## 🆘 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Can't connect to DB | Check DATABASE_URL in .env |
| Token expired | Use POST /api/auth/refresh |
| Booking not created | Verify using Finance approve endpoint |
| Can't submit application | Check /api/bloggers/:uid/booking-status |
| 403 Forbidden | Wrong role for endpoint |
| 409 Conflict | Business logic error (see message) |

---

## 🎯 Most Important Functions

```javascript
// #1: Finance approves AND creates 7-day booking ⭐
approveByFinance(applicationId, approvedBy, approvedBudget, remarks)
→ Returns: { application, booking }

// #2: Check if user can submit (enforces block) ⭐
checkBookingStatus(bloggerId, userId)
→ Returns: { canSubmit: boolean, blockReason: string }

// #3: Endpoints for complete workflow ⭐
POST /api/applications                      → Submit
POST /api/applications/:id/approve          → Checking approve
POST /api/applications/:id/finance-approve  → Finance approve (creates booking!)
POST /api/applications/:id/reject           → Reject
POST /api/bookings/:id/cancel               → Release blogger
```

---

## 📊 Statistics

- **18 API endpoints** (fully functional)
- **2 core services** (application.js, booking.js)
- **1 scheduled job** (bookingExpiry.js)
- **~1,330 lines** of production code
- **~400 lines** of test code
- **~1,200 lines** of documentation
- **100% Phase 4 complete** ✅

---

## 🎓 Learning Path

1. Read this Quick Reference (2 min)
2. Run workflow test (1 min) - `npm run test:booking-workflow`
3. Read DEVELOPER_GUIDE.md (15 min)
4. Try workflow with curl (10 min)
5. Read API_DOCUMENTATION.md (20 min)
6. Make your first change (15 min)
7. Review PHASE_4_COMPLETION.md (20 min)

**Total: ~80 minutes to full understanding**

---

## 🚀 Ready to Develop?

1. ✅ Setup done? (`npm install`, `npm run migrate`, `npm run seed`)
2. ✅ Server running? (`npm run dev`)
3. ✅ Test passing? (`npm run test:booking-workflow`)
4. ✅ Documentation read? (API_DOCUMENTATION.md)
5. 🚀 **Start coding!**

---

**Quick Reference v1.0 | Phase 4 Complete | June 30, 2026**
