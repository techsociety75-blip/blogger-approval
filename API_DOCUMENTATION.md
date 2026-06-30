# API Documentation
## Blogger Cooperation Approval & Budget Management System
**Version:** 1.0.0 | **Status:** Phase 4 - Core Workflow Complete

---

## Table of Contents
1. [Authentication](#authentication)
2. [Bloggers](#bloggers)
3. [Applications (Workflow)](#applications-workflow)
4. [Bookings (7-Day System)](#bookings-7-day-system)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

---

## Authentication

### POST /api/auth/login
**Login with username and password**

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "hina.tariq",
    "password": "DemoPassword123!"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440001",
      "username": "hina.tariq",
      "email": "hina.tariq@company.com",
      "role": "staff",
      "firstName": "Hina",
      "lastName": "Tariq",
      "teamId": "team-1"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "expiresIn": "7d"
    }
  }
}
```

**Available Test Users:**
```
Admin:     ali.ahmad / DemoPassword123!
Staff:     hina.tariq / DemoPassword123!
Staff:     omar.farooq / DemoPassword123!
Checking:  bilal.aslam / DemoPassword123!
Finance:   sara.khan / DemoPassword123!
Team Ldr:  usman.raza / DemoPassword123!
Team Ldr:  mahnoor.iqbal / DemoPassword123!
```

### POST /api/auth/refresh
**Refresh expired access token**

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": "7d"
  }
}
```

---

## Bloggers

### GET /api/bloggers?q=search_term
**Search bloggers by UID, username, or name**

```bash
curl -X GET "http://localhost:3000/api/bloggers?q=aisha" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bloggers": [
      {
        "uid": "blogger-001",
        "username": "aisha.malik",
        "name": "Aisha Malik",
        "email": "aisha@example.com",
        "followers": 50000,
        "category": "Fashion",
        "status": "active",
        "booked_status": "available",
        "booked_by_staff_name": null,
        "booked_until": null,
        "cooperation_count": 2,
        "last_cooperation": "2026-05-15",
        "blacklisted": false
      }
    ],
    "count": 1
  }
}
```

### GET /api/bloggers/:uid
**Get specific blogger details**

```bash
curl -X GET "http://localhost:3000/api/bloggers/blogger-001" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "uid": "blogger-001",
    "username": "aisha.malik",
    "name": "Aisha Malik",
    "email": "aisha@example.com",
    "followers": 50000,
    "category": "Fashion",
    "status": "active",
    "booked_status": "available",
    "booked_by_staff_id": null,
    "booked_by_staff_name": null,
    "booked_until": null,
    "booking_id": null,
    "cooperation_count": 2,
    "last_cooperation": "2026-05-15",
    "blacklisted": false,
    "blacklist_expiry": null
  }
}
```

### GET /api/bloggers/:uid/booking-status
**Check if can submit application for blogger (booking block enforcement)**

```bash
curl -X GET "http://localhost:3000/api/bloggers/blogger-001/booking-status" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK) - If NOT booked:**
```json
{
  "success": true,
  "data": {
    "bookerStatus": "available",
    "canSubmit": true,
    "blockReason": null,
    "booking": null
  }
}
```

**Response (200 OK) - If BOOKED by another staff:**
```json
{
  "success": true,
  "data": {
    "bookerStatus": "booked",
    "canSubmit": false,
    "blockReason": "This blogger is exclusively booked to Hina Tariq until 7/7/2026 (7 days remaining)",
    "booking": {
      "bookedBy": "Hina Tariq",
      "bookedUntil": "2026-07-07T14:30:00Z",
      "daysRemaining": 7
    }
  }
}
```

**Response (200 OK) - If BOOKED by same staff (can submit):**
```json
{
  "success": true,
  "data": {
    "bookerStatus": "booked",
    "canSubmit": true,
    "blockReason": null,
    "booking": {
      "bookedBy": "Hina Tariq",
      "bookedUntil": "2026-07-07T14:30:00Z",
      "daysRemaining": 7
    }
  }
}
```

---

## Applications (Workflow)

### POST /api/applications
**Submit new application (Staff only)**

```bash
curl -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "bloggerUid": "blogger-001",
    "campaignName": "Summer Fashion Campaign",
    "requestedBudget": 5000,
    "notes": "High priority blogger, good engagement"
  }'
```

**Response (201 Created):**
```json
{
  "success": true,
  "message": "Application submitted successfully",
  "data": {
    "id": "REQ-0001",
    "blogger_uid": "blogger-001",
    "staff_id": "550e8400-e29b-41d4-a716-446655440001",
    "staff_name": "Hina Tariq",
    "team_id": "team-1",
    "campaign_name": "Summer Fashion Campaign",
    "requested_budget": 5000,
    "eligibility_status": "eligible",
    "checking_status": "pending",
    "finance_status": "pending",
    "submitted_at": "2026-06-30T14:30:00Z"
  }
}
```

### GET /api/applications
**Get applications (filtered by role)**

```bash
curl -X GET "http://localhost:3000/api/applications" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "id": "REQ-0001",
        "blogger_uid": "blogger-001",
        "staff_id": "550e8400-e29b-41d4-a716-446655440001",
        "staff_name": "Hina Tariq",
        "campaign_name": "Summer Fashion Campaign",
        "requested_budget": 5000,
        "eligibility_status": "eligible",
        "checking_status": "pending",
        "finance_status": "pending",
        "final_result": "pending",
        "submitted_at": "2026-06-30T14:30:00Z"
      }
    ],
    "count": 1
  }
}
```

### GET /api/applications/:id
**Get single application details**

```bash
curl -X GET "http://localhost:3000/api/applications/REQ-0001" \
  -H "Authorization: Bearer <accessToken>"
```

### POST /api/applications/:id/approve
**Approve application (Checking Department only)**

```bash
curl -X POST "http://localhost:3000/api/applications/REQ-0001/approve" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Blogger meets all requirements. Ready for Finance review."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application approved by Checking Department",
  "data": {
    "application": {
      "id": "REQ-0001",
      "checking_status": "approved",
      "checked_by": "550e8400-e29b-41d4-a716-446655440003",
      "checked_at": "2026-06-30T14:35:00Z",
      "checking_remarks": "Blogger meets all requirements..."
    },
    "nextStep": "Awaiting Finance Department approval"
  }
}
```

### POST /api/applications/:id/reject
**Reject application (Checking or Finance)**

```bash
curl -X POST "http://localhost:3000/api/applications/REQ-0001/reject" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "remarks": "Blogger is on blacklist for 30 more days"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application rejected by Checking Department",
  "data": {
    "application": {
      "id": "REQ-0001",
      "checking_status": "rejected",
      "checked_by": "550e8400-e29b-41d4-a716-446655440003",
      "final_result": "rejected"
    },
    "reason": "Blogger is on blacklist for 30 more days"
  }
}
```

### POST /api/applications/:id/finance-approve
**⭐ CRITICAL: Finance approves with auto-created 7-day booking**

This is the most important endpoint. When Finance approves:
1. Application status changes to "approved"
2. **7-day booking is AUTOMATICALLY created**
3. Blogger is locked to staff member for 7 days
4. Other staff cannot submit for this blogger during booking

```bash
curl -X POST "http://localhost:3000/api/applications/REQ-0001/finance-approve" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "approvedBudget": 5000,
    "remarks": "Budget approved and allocated"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application approved by Finance with automatic 7-day booking created",
  "data": {
    "application": {
      "id": "REQ-0001",
      "finance_status": "approved",
      "final_result": "approved",
      "approved_budget": 5000,
      "approved_by_finance": "550e8400-e29b-41d4-a716-446655440004",
      "approved_at": "2026-06-30T14:40:00Z",
      "booking_id": "bk-uuid-1234"
    },
    "booking": {
      "id": "bk-uuid-1234",
      "bloggerId": "blogger-001",
      "bookedBy": "Hina Tariq",
      "bookedUntil": "2026-07-07T14:40:00Z",
      "daysRemaining": 7,
      "status": "active"
    },
    "approvedBudget": 5000
  }
}
```

### POST /api/applications/:id/escalate
**Escalate rejected application to Team Leader for recheck**

```bash
curl -X POST "http://localhost:3000/api/applications/REQ-0001/escalate" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Disputed rejection - blogger should be eligible",
    "teamLeaderId": "550e8400-e29b-41d4-a716-446655440005"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Application escalated to Team Leader for recheck",
  "data": {
    "applicationId": "REQ-0001",
    "recheckId": "REC-1234",
    "status": "escalated",
    "reason": "Disputed rejection - blogger should be eligible"
  }
}
```

### POST /api/applications/recheck/:recheckId/justification
**Team Leader submits recheck justification**

```bash
curl -X POST "http://localhost:3000/api/applications/recheck/REC-1234/justification" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "justification": "After review, the blogger meets all eligibility criteria. The waiting period concern is not applicable in this case."
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Recheck justification submitted successfully",
  "data": {
    "recheckId": "REC-1234",
    "status": "submitted",
    "originalApplicationId": "REQ-0001",
    "submittedAt": "2026-06-30T15:00:00Z"
  }
}
```

---

## Bookings (7-Day System)

### GET /api/bookings
**List all active bookings (role-filtered)**

```bash
curl -X GET "http://localhost:3000/api/bookings" \
  -H "Authorization: Bearer <accessToken>"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "bookings": [
      {
        "id": "bk-uuid-1234",
        "blogger_uid": "blogger-001",
        "booked_by_staff_id": "550e8400-e29b-41d4-a716-446655440001",
        "booked_by_staff_name": "Hina Tariq",
        "application_id": "REQ-0001",
        "booked_until": "2026-07-07T14:40:00Z",
        "status": "active",
        "extended_count": 0,
        "created_at": "2026-06-30T14:40:00Z"
      }
    ],
    "count": 1
  }
}
```

### GET /api/bookings/:id
**Get booking details**

```bash
curl -X GET "http://localhost:3000/api/bookings/bk-uuid-1234" \
  -H "Authorization: Bearer <accessToken>"
```

### POST /api/bookings/:id/extend
**Extend booking duration (Admin only)**

```bash
curl -X POST "http://localhost:3000/api/bookings/bk-uuid-1234/extend" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "daysToAdd": 7
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking extended successfully",
  "data": {
    "bookingId": "bk-uuid-1234",
    "newBookedUntil": "2026-07-14T14:40:00Z",
    "daysRemaining": 14,
    "daysAdded": 7
  }
}
```

### POST /api/bookings/:id/cancel
**Cancel booking and release blogger (Admin only)**

```bash
curl -X POST "http://localhost:3000/api/bookings/bk-uuid-1234/cancel" \
  -H "Authorization: Bearer <accessToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Campaign cancelled by client"
  }'
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Booking cancelled successfully",
  "data": {
    "bookingId": "bk-uuid-1234",
    "status": "cancelled",
    "message": "Booking cancelled successfully",
    "reason": "Campaign cancelled by client"
  }
}
```

---

## Error Handling

### Error Response Format
All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "detail": "Optional additional details"
  },
  "timestamp": "2026-06-30T14:40:00Z"
}
```

### Common Error Codes

| Code | Status | Description |
|------|--------|-------------|
| `VALIDATION_ERROR` | 400 | Missing or invalid input |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Business logic conflict (e.g., booking block) |
| `INVALID_STATE` | 409 | Invalid state for operation |
| `UNAUTHORIZED` | 401 | Missing or invalid token |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `INTERNAL_ERROR` | 500 | Server error |

### Example Error Response
```json
{
  "error": {
    "code": "CONFLICT",
    "message": "This blogger is booked by another staff member",
    "detail": "You cannot submit applications for this blogger until the booking expires"
  },
  "timestamp": "2026-06-30T14:40:00Z"
}
```

---

## Rate Limiting

- **Limit:** 100 requests per 15 minutes
- **Header:** `X-RateLimit-Remaining`
- **Response:** 429 Too Many Requests when exceeded

```bash
curl -I http://localhost:3000/api/bloggers
# Response headers include:
# X-RateLimit-Limit: 100
# X-RateLimit-Remaining: 99
# X-RateLimit-Reset: 1234567890
```

---

## Complete Workflow Example

### 1. Login as Staff
```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "hina.tariq", "password": "DemoPassword123!"}' \
  | jq -r '.data.tokens.accessToken')
```

### 2. Search for Blogger
```bash
curl -s -X GET "http://localhost:3000/api/bloggers?q=aisha" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 3. Check Booking Status
```bash
curl -s -X GET "http://localhost:3000/api/bloggers/blogger-001/booking-status" \
  -H "Authorization: Bearer $TOKEN" | jq
```

### 4. Submit Application
```bash
APP_ID=$(curl -s -X POST http://localhost:3000/api/applications \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "bloggerUid": "blogger-001",
    "campaignName": "Summer Campaign",
    "requestedBudget": 5000
  }' | jq -r '.data.id')
echo $APP_ID  # e.g., REQ-0001
```

### 5. Approve Application (Checking Dept)
```bash
# Login as checking staff
CHECKING_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "bilal.aslam", "password": "DemoPassword123!"}' \
  | jq -r '.data.tokens.accessToken')

# Approve
curl -s -X POST "http://localhost:3000/api/applications/$APP_ID/approve" \
  -H "Authorization: Bearer $CHECKING_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"remarks": "Approved"}' | jq
```

### 6. Finance Approves (AUTO-CREATES 7-DAY BOOKING)
```bash
# Login as finance staff
FINANCE_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "sara.khan", "password": "DemoPassword123!"}' \
  | jq -r '.data.tokens.accessToken')

# Finance approve - THIS CREATES THE 7-DAY BOOKING
curl -s -X POST "http://localhost:3000/api/applications/$APP_ID/finance-approve" \
  -H "Authorization: Bearer $FINANCE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"approvedBudget": 5000}' | jq
```

### 7. Verify Booking Block
```bash
# Try as different staff (Omar) - should be blocked
OMAR_TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "omar.farooq", "password": "DemoPassword123!"}' \
  | jq -r '.data.tokens.accessToken')

curl -s -X GET "http://localhost:3000/api/bloggers/blogger-001/booking-status" \
  -H "Authorization: Bearer $OMAR_TOKEN" | jq
# Shows: "canSubmit": false, "blockReason": "Booked by Hina Tariq until..."
```

---

## Summary

The Phase 4 implementation provides:
- ✅ Complete application workflow (Submit → Checking → Finance)
- ✅ Auto-created 7-day bookings on Finance approval
- ✅ Booking blocks prevent other staff from submitting
- ✅ Staff names displayed on all booking records
- ✅ Team Leader escalation workflow
- ✅ Comprehensive error handling and validation
- ✅ Role-based access control on all endpoints

**Next Phase:** Phase 5 - Admin Dashboard & User Management
