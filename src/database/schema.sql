-- ============================================================
-- Blogger Cooperation Approval & Budget Management System
-- Database Schema (Vercel Postgres)
-- ============================================================

-- ============================================================
-- 1. USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'staff', 'checking', 'finance', 'team-leader')),
    team_id UUID,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    last_login TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    notes TEXT
);

-- ============================================================
-- 2. TEAMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    team_leader_id UUID REFERENCES users(id),
    monthly_budget DECIMAL(15, 2) NOT NULL DEFAULT 500000,
    used_budget DECIMAL(15, 2) NOT NULL DEFAULT 0,
    special_budget_exceptions DECIMAL(15, 2) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES users(id)
);

-- Add team_id foreign key to users
ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id);

-- ============================================================
-- 3. BLOGGERS TABLE (Master Data from Google Sheets)
-- ============================================================
CREATE TABLE IF NOT EXISTS bloggers (
    uid VARCHAR(20) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    engagement_score DECIMAL(5, 2),
    followers_count INTEGER,
    cooperation_count INTEGER NOT NULL DEFAULT 0,
    last_cooperation DATE,
    blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    blacklist_date DATE,
    blacklist_reason TEXT,
    blacklist_added_by UUID REFERENCES users(id),
    blacklist_expiry DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blacklisted')),
    -- 7-Day Booking Fields
    booked_status VARCHAR(20) DEFAULT 'available' CHECK (booked_status IN ('available', 'booked')),
    booked_by_staff_id UUID REFERENCES users(id),
    booked_by_staff_name VARCHAR(255),
    booked_until TIMESTAMP,
    booked_at TIMESTAMP,
    booking_id UUID,
    booked_by_application_id VARCHAR(50),
    -- Sync & Audit
    last_synced TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_from_sheets BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bloggers_uid ON bloggers(uid);
CREATE INDEX idx_bloggers_username ON bloggers(username);
CREATE INDEX idx_bloggers_blacklisted ON bloggers(blacklisted);
CREATE INDEX idx_bloggers_status ON bloggers(status);
CREATE INDEX idx_bloggers_booked_status ON bloggers(booked_status);
CREATE INDEX idx_bloggers_booked_by_staff_id ON bloggers(booked_by_staff_id);
CREATE INDEX idx_bloggers_booked_until ON bloggers(booked_until);

-- ============================================================
-- 4. APPLICATIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(50) PRIMARY KEY,
    blogger_uid VARCHAR(20) NOT NULL REFERENCES bloggers(uid),
    staff_id UUID NOT NULL REFERENCES users(id),
    staff_name VARCHAR(255) NOT NULL,
    team_id UUID REFERENCES teams(id),
    campaign_name VARCHAR(255) NOT NULL,
    requested_budget DECIMAL(15, 2) NOT NULL,
    approved_budget DECIMAL(15, 2),
    notes_to_checking TEXT,
    -- Workflow Status
    eligibility_status VARCHAR(50) NOT NULL DEFAULT 'eligible' CHECK (eligibility_status IN ('eligible', 'waiting-period', 'blacklisted', 'ineligible')),
    checking_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (checking_status IN ('pending', 'approved', 'rejected')),
    checking_remarks TEXT,
    checked_by UUID REFERENCES users(id),
    checked_at TIMESTAMP,
    finance_status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (finance_status IN ('pending', 'approved', 'rejected')),
    finance_remarks TEXT,
    approved_by_finance UUID REFERENCES users(id),
    approved_at TIMESTAMP,
    final_result VARCHAR(50) DEFAULT 'pending' CHECK (final_result IN ('approved', 'rejected', 'pending')),
    -- Booking Reference (7-Day Booking)
    booking_id UUID,
    booked_by_name VARCHAR(255),
    -- Team Leader Recheck
    escalated_to_team_leader BOOLEAN DEFAULT FALSE,
    escalated_at TIMESTAMP,
    escalation_reason TEXT,
    -- Timestamps
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_applications_blogger_uid ON applications(blogger_uid);
CREATE INDEX idx_applications_staff_id ON applications(staff_id);
CREATE INDEX idx_applications_team_id ON applications(team_id);
CREATE INDEX idx_applications_checking_status ON applications(checking_status);
CREATE INDEX idx_applications_finance_status ON applications(finance_status);
CREATE INDEX idx_applications_final_result ON applications(final_result);
CREATE INDEX idx_applications_submitted_at ON applications(submitted_at);
CREATE INDEX idx_applications_booking_id ON applications(booking_id);

-- ============================================================
-- 5. BLOGGER_BOOKINGS TABLE (7-Day Booking System)
-- ============================================================
CREATE TABLE IF NOT EXISTS blogger_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blogger_uid VARCHAR(20) NOT NULL REFERENCES bloggers(uid),
    booked_by_staff_id UUID NOT NULL REFERENCES users(id),
    booked_by_staff_name VARCHAR(255) NOT NULL,
    application_id VARCHAR(50) NOT NULL REFERENCES applications(id),
    booked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    booked_until TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'extended')),
    -- Extension tracking
    extended_count INTEGER DEFAULT 0,
    extended_by UUID REFERENCES users(id),
    extended_at TIMESTAMP,
    -- Cancellation tracking
    cancelled_by UUID REFERENCES users(id),
    cancelled_at TIMESTAMP,
    cancellation_reason TEXT,
    -- Metadata
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bookings_blogger_uid ON blogger_bookings(blogger_uid);
CREATE INDEX idx_bookings_booked_by_staff_id ON blogger_bookings(booked_by_staff_id);
CREATE INDEX idx_bookings_booked_until ON blogger_bookings(booked_until);
CREATE INDEX idx_bookings_status ON blogger_bookings(status);
CREATE INDEX idx_bookings_application_id ON blogger_bookings(application_id);

-- ============================================================
-- 6. TEAM_LEADER_RECHECKS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS team_leader_rechecks (
    id VARCHAR(50) PRIMARY KEY,
    original_application_id VARCHAR(50) NOT NULL REFERENCES applications(id),
    blogger_uid VARCHAR(20) NOT NULL REFERENCES bloggers(uid),
    staff_id UUID NOT NULL REFERENCES users(id),
    team_leader_id UUID NOT NULL REFERENCES users(id),
    original_rejection_reason TEXT NOT NULL,
    recheck_justification TEXT,
    submitted_by_team_leader_at TIMESTAMP,
    checking_rechecked_by UUID REFERENCES users(id),
    checking_rechecked_at TIMESTAMP,
    rechecked_decision VARCHAR(50) CHECK (rechecked_decision IN ('approved', 'rejected')),
    rechecked_remarks TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'awaiting-justification' CHECK (status IN ('awaiting-justification', 'submitted', 'rechecked', 'closed')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_rechecks_application_id ON team_leader_rechecks(original_application_id);
CREATE INDEX idx_rechecks_team_leader_id ON team_leader_rechecks(team_leader_id);
CREATE INDEX idx_rechecks_status ON team_leader_rechecks(status);

-- ============================================================
-- 7. AUDIT_LOGS TABLE (Immutable - All actions logged)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(255),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('blogger', 'application', 'booking', 'user', 'team', 'blacklist', 'system')),
    entity_id VARCHAR(100),
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    http_method VARCHAR(10),
    http_path VARCHAR(500),
    status_code INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX USING BTREE (created_at),
    INDEX USING BTREE (user_id),
    INDEX USING BTREE (entity_type),
    INDEX USING BTREE (action)
);

-- Note: This is an immutable table - no updates, only inserts
-- Retention policy: Keep logs for 90 days (configured in env)

-- ============================================================
-- 8. SEARCH_LOGS TABLE (Performance tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS search_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    search_query VARCHAR(255) NOT NULL,
    search_type VARCHAR(50) NOT NULL CHECK (search_type IN ('uid', 'username', 'name', 'full-text')),
    results_count INTEGER,
    response_time_ms INTEGER NOT NULL,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX USING BTREE (created_at),
    INDEX USING BTREE (user_id),
    INDEX USING BTREE (search_type)
);

-- ============================================================
-- 9. BLACKLIST_CHANGES TABLE (Track blacklist modifications)
-- ============================================================
CREATE TABLE IF NOT EXISTS blacklist_changes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blogger_uid VARCHAR(20) NOT NULL REFERENCES bloggers(uid),
    action VARCHAR(20) NOT NULL CHECK (action IN ('added', 'removed', 'extended', 'updated')),
    reason TEXT,
    severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high')),
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    effective_until DATE,
    notes TEXT,
    INDEX USING BTREE (blogger_uid),
    INDEX USING BTREE (changed_at)
);

-- ============================================================
-- 10. GOOGLE_SHEETS_SYNC_LOG TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS google_sheets_sync_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('pull', 'push', 'bidirectional')),
    rows_processed INTEGER,
    rows_created INTEGER,
    rows_updated INTEGER,
    status VARCHAR(50) NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
    error_message TEXT,
    started_at TIMESTAMP NOT NULL,
    completed_at TIMESTAMP,
    duration_seconds INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX USING BTREE (created_at),
    INDEX USING BTREE (status)
);

-- ============================================================
-- VIEWS (For common queries)
-- ============================================================

-- Active bookings view
CREATE OR REPLACE VIEW active_bookings AS
SELECT
    bb.id,
    bb.blogger_uid,
    b.name as blogger_name,
    bb.booked_by_staff_id,
    bb.booked_by_staff_name,
    u.first_name || ' ' || u.last_name as staff_full_name,
    bb.booked_at,
    bb.booked_until,
    EXTRACT(DAY FROM (bb.booked_until - CURRENT_TIMESTAMP)) as days_remaining,
    bb.application_id,
    bb.status
FROM blogger_bookings bb
JOIN bloggers b ON bb.blogger_uid = b.uid
JOIN users u ON bb.booked_by_staff_id = u.id
WHERE bb.status = 'active'
ORDER BY bb.booked_until DESC;

-- Pending applications view
CREATE OR REPLACE VIEW pending_applications AS
SELECT
    a.id,
    a.blogger_uid,
    b.name as blogger_name,
    a.staff_id,
    u.first_name || ' ' || u.last_name as staff_name,
    t.name as team_name,
    a.campaign_name,
    a.requested_budget,
    a.eligibility_status,
    a.checking_status,
    a.finance_status,
    a.submitted_at
FROM applications a
JOIN bloggers b ON a.blogger_uid = b.uid
JOIN users u ON a.staff_id = u.id
LEFT JOIN teams t ON a.team_id = t.id
WHERE a.final_result = 'pending'
ORDER BY a.submitted_at DESC;

-- Team performance view
CREATE OR REPLACE VIEW team_performance AS
SELECT
    t.id,
    t.name as team_name,
    COUNT(a.id) as total_applications,
    SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN a.final_result = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
    ROUND(
        100.0 * SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(a.id), 0),
        2
    ) as approval_rate,
    SUM(a.approved_budget) as total_budget_approved,
    CURRENT_DATE - MAX(a.submitted_at) as days_since_last_application
FROM teams t
LEFT JOIN applications a ON t.id = a.team_id
GROUP BY t.id, t.name
ORDER BY approval_rate DESC;

-- Staff performance view
CREATE OR REPLACE VIEW staff_performance AS
SELECT
    u.id,
    u.first_name || ' ' || u.last_name as staff_name,
    t.name as team_name,
    COUNT(a.id) as total_applications,
    SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) as approved_count,
    SUM(CASE WHEN a.final_result = 'rejected' THEN 1 ELSE 0 END) as rejected_count,
    ROUND(
        100.0 * SUM(CASE WHEN a.final_result = 'approved' THEN 1 ELSE 0 END) /
        NULLIF(COUNT(a.id), 0),
        2
    ) as approval_rate,
    SUM(a.approved_budget) as total_budget_approved,
    AVG(EXTRACT(DAY FROM (a.approved_at - a.submitted_at))) as avg_approval_days
FROM users u
LEFT JOIN applications a ON u.id = a.staff_id
LEFT JOIN teams t ON u.team_id = t.id
WHERE u.role = 'staff'
GROUP BY u.id, u.first_name, u.last_name, t.name
ORDER BY approval_rate DESC;

-- ============================================================
-- END OF SCHEMA
-- ============================================================
