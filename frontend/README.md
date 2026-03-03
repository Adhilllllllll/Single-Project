# EduNexus — Where Learning Connects

## Overview
EduNexus is a comprehensive educational review management platform built using the MERN stack.
It simplifies the process of managing student reviews by enabling structured interaction between admins, advisors, reviewers, and students.

---

## Tech Stack
Frontend:
- React
- Redux Toolkit
- React Router
- Axios

Backend:
- Node.js
- Express.js
- MongoDB
- JWT Authentication

Architecture:
- Modular Monolith

---

## User Roles
- Admin
- Advisor
- Reviewer
- Student

Each role has a dedicated dashboard and access control.

---

## Features

### Authentication & Authorization
- JWT-based authentication
- Role-based routing
- Protected routes
- Secure login and logout

---

### Reviewer Module (Implemented)
- Reviewer dashboard
- Add availability slots (day, start time, end time)
- View availability
- Delete availability
- Real-time UI updates using Redux

---

### Student Module (MVP)
- Student dashboard
- Profile information
- Advisor section (placeholder)
- Upcoming reviews (placeholder)
- Feedback section (placeholder)

---

### Advisor Module (MVP)
- Advisor dashboard
- Profile information
- Assigned students (placeholder)
- Upcoming reviews (placeholder)
- Feedback overview (placeholder)

---

### Admin Module
- Admin dashboard
- User management foundation
- Future scope: analytics and system monitoring

---

## Frontend Folder Structure

src/
- api/
- app/
- components/
- features/
  - auth/
  - availability/
  - advisor/
  - student/
  - admin/
- pages/
  - dashboards/
- utils/

---

## Backend Highlights
- Separate collections for users and students
- Role-based access control
- Modular routing
- Secure password handling
- Reviewer availability APIs

---

## Future Enhancements
- Review scheduling system
- Feedback and scoring
- Real-time chat
- Video review sessions (WebRTC)
- Analytics dashboard

---

## Status
✔ Authentication complete  
✔ Role-based dashboards implemented  
✔ Reviewer availability fully functional  
✔ MVP ready and demo-ready  

---

## Author
Developed as part of a full-stack MERN project with focus on clean architecture and scalability.
