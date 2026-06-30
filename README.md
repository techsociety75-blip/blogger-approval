# Blogger Cooperation Approval & Budget Management System
## Backend API - Node.js/Express

**Version:** 1.0.0 (Phase 1: Foundation)  
**Status:** 🔨 In Development  
**Last Updated:** June 30, 2026

---

## 📋 Overview

This is the backend API for the Blogger Cooperation Approval & Budget Management System. It handles:

- **5-Role Workflow:** Admin, Staff, Checking Dept, Finance Dept, Team Leader
- **Real-Time Google Sheets Sync:** Bidirectional data synchronization
- **Fast Search:** Indexed search with Redis caching (<1 second)
- **7-Day Booking System:** Automatic blogger booking on Finance approval
- **Immutable Audit Logging:** Complete compliance trail
- **RBAC:** Role-based access control with strict enforcement

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Vercel Postgres connection string
- Redis instance (for caching)

### Installation

```bash
# Clone repository
git clone <repo-url>
cd blogger-approval-backend

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Setup Database

```bash
# Run migrations and create schema
npm run migrate

# Seed with demo data
npm run seed
```

### Start Server

```bash
# Development (with hot reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

---

## 📁 Project Structure

```
src/
├── app.js                          (Main Express app)
├── config/
│   └── database.js                 (Vercel Postgres config)
├── database/
│   ├── schema.sql                  (Complete database schema)
│   ├── migrations/                 (Migration files)
│   ├── runMigrations.js            (Migration runner)
│   └── seed.js                     (Demo data seeder)
├── api/
│   ├── routes/
│   │   ├── auth.js                 (Login, token management)
│   │   ├── bloggers.js             (Blogger search, profiles)
│   │   ├── applications.js         (Application workflow)
│   │   ├── bookings.js             (7-day booking system)
│   │   ├── admin.js                (Admin operations)
│   │   └── reports.js              (Analytics, dashboards)
│   ├── middleware/
│   │   ├── auth.js                 (JWT authentication, RBAC)
│   │   ├── errorHandler.js         (Global error handling)
│   │   └── requestLogger.js        (HTTP request logging)
│   └── controllers/                (Business logic - Phase 3+)
├── services/
│   ├── googleSheets.js             (Google Sheets API - Phase 2)
│   ├── search.js                   (Search with caching - Phase 3)
│   ├── booking.js                  (7-day booking logic - Phase 4)
│   ├── audit.js                    (Audit logging - Phase 5)
│   └── notifications.js            (Email alerts - Phase 5)
├── jobs/
│   ├── googleSheetSync.js          (Scheduled sync - Phase 2)
│   ├── bookingExpiry.js            (Auto-expire bookings - Phase 4)
│   └── auditCleanup.js             (Log retention - Phase 5)
├── utils/
│   ├── logger.js                   (Logging utility)
│   └── validators.js               (Input validation)
└── tests/
    ├── unit/                       (Unit tests - Phase 6)
    ├── integration/                (Integration tests - Phase 6)
    ├── security/                   (Security tests - Phase 6)
    └── performance/                (Performance tests - Phase 6)
```

---

## 🔐 Authentication

### Login

```bash
POST /api/auth/login
Content-Type: application/json

{
  "username": "hina.tariq",
  "password": "DemoPassword123!"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "hina.tariq",
      "email": "hina.tariq@company.com",
      "role": "staff",
      "firstName": "Hina",
      "lastName": "Tariq"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIs...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
      "expiresIn": "7d"
    }
  }
}
```

### Using Token

Include in Authorization header:
```bash
Authorization: Bearer <accessToken>
```

### Demo Users

```
Admin:     ali.ahmad / DemoPassword123!
Staff:     hina.tariq / DemoPassword123!
Staff:     omar.farooq / DemoPassword123!
Checking:  bilal.aslam / DemoPassword123!
Finance:   sara.khan / DemoPassword123!
Team Ldr:  usman.raza / DemoPassword123!
Team Ldr:  mahnoor.iqbal / DemoPassword123!
```

---

## 📡 API Endpoints

### Bloggers (Search)
```
GET    /api/bloggers?q=search_term      Search bloggers
GET    /api/bloggers/:uid               Get blogger details
GET    /api/bloggers/:uid/booking-status Check if can submit
```

### Applications (Workflow)
```
POST   /api/applications                Submit new application
GET    /api/applications                Get applications (role-filtered)
GET    /api/applications/:id            Get single application
POST   /api/applications/:id/approve    Approve (Checking)
POST   /api/applications/:id/reject     Reject
POST   /api/applications/:id/finance-approve  Approve with budget & booking
```

### Bookings (7-Day System)
```
GET    /api/bookings                    List active bookings
GET    /api/bookings/:id                Get booking details
POST   /api/bookings/:id/extend         Extend booking (Admin)
POST   /api/bookings/:id/cancel         Cancel booking (Admin)
```

### Admin
```
GET    /api/admin/dashboard             System overview
GET    /api/admin/users                 List users
POST   /api/admin/users                 Create user
GET    /api/admin/teams                 List teams
GET    /api/admin/audit-logs            View audit trail
GET    /api/admin/blacklist             View blacklist
```

### Reports
```
GET    /api/reports/dashboard           Role-specific stats
GET    /api/reports/team-performance    Team analytics
GET    /api/reports/staff-performance   Staff analytics
GET    /api/reports/export              Export data (Admin only)
```

---

## 🗄️ Database Schema

### Tables
- **users** — User accounts with roles
- **teams** — Team management and budget allocation
- **bloggers** — Master blogger data from Google Sheets
- **applications** — Approval workflow
- **blogger_bookings** — 7-day booking system (CRITICAL)
- **team_leader_rechecks** — Escalation workflow
- **audit_logs** — Immutable compliance trail
- **search_logs** — Performance tracking
- **blacklist_changes** — Blacklist history
- **google_sheets_sync_log** — Sync tracking

### Key Indexes
- Bloggers: uid, username, blacklisted, status, booked_status
- Applications: blogger_uid, staff_id, checking_status, finance_status
- Bookings: blogger_uid, booked_by_staff_id, booked_until, status

### Views
- **active_bookings** — Currently active 7-day bookings
- **pending_applications** — Applications awaiting decision
- **team_performance** — Team statistics
- **staff_performance** — Staff statistics

---

## 🔄 Development Phases

### Phase 1: Foundation ✅ (CURRENT)
- [x] Project setup
- [x] Database schema
- [x] Authentication (Login with JWT)
- [x] Basic CRUD routes
- [ ] Database migrations
- [ ] Seed demo data

### Phase 2: Real-Time Sync (Next)
- [ ] Google Sheets API integration
- [ ] Bidirectional sync every 2 minutes
- [ ] Real-time booking status updates
- [ ] Sync error handling

### Phase 3: Search & Performance
- [ ] Full-text search indexing
- [ ] Redis caching (5-min TTL)
- [ ] Performance optimization
- [ ] Search < 1 second guarantee

### Phase 4: Core Workflow (CRITICAL)
- [ ] Application approval workflow
- [ ] Checking Department approve/reject/escalate
- [ ] Finance approval WITH auto-booking
- [ ] 7-day booking auto-creation
- [ ] Booking block enforcement
- [ ] Team Leader recheck workflow

### Phase 5: Admin & Audit
- [ ] Admin dashboard (complete)
- [ ] User management CRUD
- [ ] Team management CRUD
- [ ] Audit logging to database
- [ ] Reports and analytics
- [ ] Data export (Admin only)

### Phase 6: Security & Testing
- [ ] Unit tests (90%+ coverage)
- [ ] Integration tests
- [ ] Security testing
- [ ] Performance testing
- [ ] Penetration testing
- [ ] Code review

### Phase 7: Deployment
- [ ] Staging environment
- [ ] Load testing (100+ concurrent)
- [ ] Monitoring setup
- [ ] Production deployment
- [ ] Health checks

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test type
npm run test:security
npm run test:performance
```

---

## 📊 Performance Targets

| Target | Goal | Status |
|--------|------|--------|
| UID Search | <100ms | 🔄 Phase 3 |
| Name Search | <500ms | 🔄 Phase 3 |
| Full Results | <1 second | 🔄 Phase 3 |
| Concurrent Users | 100+ | 🔄 Phase 7 |
| Uptime | 99.9% | 🔄 Phase 7 |

---

## 🔒 Security Checklist

- [ ] JWT tokens validated
- [ ] RBAC enforced on all endpoints
- [ ] Input validation on all POST/PUT
- [ ] SQL injection prevention (prepared statements)
- [ ] Rate limiting enabled
- [ ] CORS configured
- [ ] Helmet security headers
- [ ] Password hashing (bcrypt)
- [ ] Audit logging complete
- [ ] No data leaks (search-only for non-admin)
- [ ] 2FA ready (Phase 6)
- [ ] Penetration tested (Phase 6)

---

## 📝 Logging

Logs are written to `logs/` directory:
- `app.log` — General application logs
- `error.log` — Error logs
- `audit.log` — Audit trail (immutable)

Set log level in .env:
```
LOG_LEVEL=debug|info|warn|error
```

---

## 🚨 Troubleshooting

### Database Connection Failed
```
Error: connect ECONNREFUSED 127.0.0.1:5432
→ Check DATABASE_URL in .env
→ Ensure Vercel Postgres is accessible
→ Check firewall rules
```

### JWT Token Expired
```
Error: jwt expired
→ Client should use refresh token endpoint
→ Server returns 401 Unauthorized
```

### Booking System Not Working
```
→ Check blogger_bookings table exists
→ Verify booked_by_staff_name is populated
→ Check Finance approval creates booking
```

---

## 📞 Support

For issues or questions:
1. Check logs in `logs/` directory
2. Review error messages in response JSON
3. Verify database schema with `schema.sql`
4. Check SYSTEM_REQUIREMENTS.html for full spec

---

## 📜 License

MIT

---

**Next Phase:** Phase 2 - Real-Time Google Sheets Sync  
**Estimated Timeline:** 6-7 weeks to production
