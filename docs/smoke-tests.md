# Smoke Test Checklist

## Prerequisites
- Backend running on `http://localhost:5000`
- Frontend running on `http://localhost:5173`
- MongoDB connected
- At least one user of each role exists (admin, advisor, reviewer, student)

---

## Authentication Tests

| Test | Steps | Expected |
|------|-------|----------|
| Login (Advisor) | POST `/api/auth/login` with advisor credentials | 200 + tokens |
| Login (Reviewer) | POST `/api/auth/login` with reviewer credentials | 200 + tokens |
| Login (Student) | POST `/api/auth/login` with student credentials | 200 + tokens |
| Invalid credentials | POST `/api/auth/login` with wrong password | 401 |

---

## Review Module Tests (Advisor)

| Test | Steps | Expected |
|------|-------|----------|
| Create review | POST `/api/reviews` with valid body | 201 + review object |
| Create review - missing field | POST `/api/reviews` without `studentId` | 400 + error message |
| Get my reviews | GET `/api/reviews/advisor/me` | 200 + array |
| Reschedule review | PATCH `/api/reviews/advisor/:id/reschedule` | 200 + updated |
| Cancel review | PATCH `/api/reviews/advisor/:id/cancel` with reason | 200 |
| Cancel already cancelled | PATCH `/api/reviews/advisor/:id/cancel` again | 400 "already cancelled" |

---

## Review Module Tests (Reviewer)

| Test | Steps | Expected |
|------|-------|----------|
| Get my reviews | GET `/api/reviews/reviewer/me` | 200 + array |
| Accept review | PATCH `/api/reviews/reviewer/:id/accept` | 200 + status "accepted" |
| Accept again | PATCH `/api/reviews/reviewer/:id/accept` | 400 "Cannot accept" |
| Reject review | PATCH `/api/reviews/reviewer/:id/reject` with reason | 200 |

---

## Notification Tests

| Test | Steps | Expected |
|------|-------|----------|
| Create review | Create a review as advisor | Notification created for reviewer + student |
| Reschedule review | Reschedule as advisor | Notification created |
| Cancel review | Cancel as advisor | Notification created |
| Check notifications | GET `/api/notifications` | 200 + array with new notifications |

---

## Authorization Tests

| Test | Steps | Expected |
|------|-------|----------|
| Advisor endpoint with reviewer token | GET `/api/reviews/advisor/me` | 401 or 403 |
| Reviewer endpoint with advisor token | GET `/api/reviews/reviewer/me` | 401 or 403 |
| No token | Any protected endpoint | 401 "No token" |

---

## Quick Verification Commands

```bash
# Backend health
curl http://localhost:5000/api/health

# Login (replace with actual credentials)
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"advisor@test.com","password":"password123"}'
```
