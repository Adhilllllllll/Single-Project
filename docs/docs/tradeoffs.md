# Known Tradeoffs & Design Decisions

## Architecture Decisions

| Decision | Rationale |
|----------|-----------|
| No repository layer | Mongoose models serve as repositories; adding another layer is over-engineering |
| Fire-and-forget notifications | UX notifications can fail silently; not mission-critical |
| Email failures swallowed | Review creation should not fail due to email issues |
| Some handlers not using service layer | Read-only, low-complexity handlers deferred by design |

## Intentional Limitations

| Limitation | Reason | Future Option |
|------------|--------|---------------|
| No automated tests | Removed to reduce maintenance; smoke tests documented | Add Jest/Vitest if team grows |
| No real-time notification push | Socket.IO ready but not wired for notifications | Add `io.emit()` in notification service |
| Email is Gmail SMTP only | Simple setup for small scale | Use SendGrid/SES for production scale |
| No notification preferences | Not a product requirement yet | Add user settings if needed |

## Security Notes

- JWT with access + refresh token pattern
- Role-based middleware on all protected routes
- Passwords hashed with bcrypt
- No sensitive data in JWT payload

## What NOT to Change

These are locked and should not be modified:
- `review.service.js` - Business logic layer
- `review.validation.js` - Input validation
- `review.helpers.js` - Pure utilities
- `notification.service.js` - Fire-and-forget notifications
- All API response contracts
