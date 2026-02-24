# Meeting Link Architecture - Developer Notes

> **🔒 FROZEN FEATURE - Phase 1 Complete**  
> Do not modify unless implementing Phase-2 (WebRTC + Socket.IO video calls)

---

## Overview

This document explains the auto-generated meeting link architecture and how it enables future video call integration without requiring schema or API changes.

## Architecture Decision

### Why reviewId as Room ID?

| Consideration | Decision |
|--------------|----------|
| **Uniqueness** | MongoDB ObjectId is globally unique |
| **Persistence** | Stored in DB, survives server restarts |
| **Simplicity** | No separate room table needed |
| **URL-safe** | ObjectId is URL-safe string |

### Meeting Link Format

```
/review-room/{reviewId}
```

Example:
```
/review-room/679abc123def456ghi789jkl
```

---

## How It Works

### 1. Review Creation Flow

```
POST /api/reviews
    ↓
Validation Layer (ignores client meetingLink)
    ↓
Service Layer creates ReviewSession
    ↓
Service generates: meetingLink = `/review-room/${review._id}`
    ↓
Returns review with meetingLink
```

### 2. Database Schema (No Changes Needed)

```javascript
// ReviewSession model already has:
{
  meetingLink: String,  // Stores: /review-room/{reviewId}
  // ... other fields
}
```

### 3. Frontend Routing

```javascript
// App.jsx
<Route path="/review-room/:reviewId" element={<ReviewRoom />} />
```

---

## Phase-2: Video Call Integration

When implementing WebRTC + Socket.IO, you only need to:

### 1. Update ReviewRoom.jsx

```javascript
// Current: Placeholder UI
// Future: Add video call logic

const { reviewId } = useParams();

// Socket.IO connection
const socket = io(SOCKET_SERVER, { auth: { token } });
socket.emit('join-room', reviewId);

// WebRTC setup
const peerConnection = new RTCPeerConnection(iceConfig);
socket.on('webrtc-signal', handleSignal);
```

### 2. Add Socket.IO Room Handler (Backend)

```javascript
// socket/handlers/videoCall.js
io.on('connection', (socket) => {
    socket.on('join-room', (reviewId) => {
        socket.join(reviewId);  // reviewId = room name
        socket.to(reviewId).emit('user-joined', socket.user);
    });
    
    socket.on('webrtc-signal', ({ room, signal }) => {
        socket.to(room).emit('webrtc-signal', signal);
    });
});
```

### 3. No Changes Required ✅

- ❌ No schema changes
- ❌ No API changes
- ❌ No meetingLink format changes
- ❌ No new database tables

---

## Safety Guarantees

### Backend Validation (`review.validation.js`)

```javascript
// meetingLink is NOT accepted from client
const { studentId, reviewerId, week, scheduledAt, mode, location } = body;
// ^^^^ Notice: NO meetingLink in destructuring
```

### Backend Service (`review.service.js`)

```javascript
// SERVER-ONLY generation
if (mode === "online") {
    review.meetingLink = `/review-room/${review._id}`;
    await review.save();
}

// Safety check
if (mode === "online" && !review.meetingLink) {
    throw new ServiceError("Failed to generate meeting link", 500);
}
```

### Mode Guarantees

| Mode | meetingLink | location |
|------|-------------|----------|
| `online` | ✅ Always `/review-room/{id}` | `null` |
| `offline` | `null` | ✅ Required |

---

## Files Reference

| File | Purpose |
|------|---------|
| `backend/src/modules/reviews/review.validation.js` | Ignores client meetingLink |
| `backend/src/modules/reviews/review.service.js` | Generates meetingLink server-side |
| `frontend/src/pages/shared/ReviewRoom.jsx` | Placeholder for video call |
| `frontend/src/App.jsx` | Route definition |
| `frontend/src/components/ProtectedRoute.jsx` | Multi-role access |

---

## Quick Reference

```javascript
// Extract reviewId from meetingLink
const reviewId = meetingLink.split('/review-room/')[1];

// Generate meetingLink from reviewId
const meetingLink = `/review-room/${reviewId}`;

// Socket.IO room name = reviewId
socket.join(reviewId);

// WebRTC room identifier = reviewId
peerConnection.roomId = reviewId;
```

---

**Last Updated:** January 2026  
**Status:** Phase 1 Complete - Ready for Phase 2
