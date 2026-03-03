import api from "../../api/axios";

/* ===========================================
   Reviewer Availability API
=========================================== */

// Get all availability (slots + breaks)
export const getAllAvailability = () => {
  return api.get("/reviewer/availability/all");
};

// Get my availability slots (legacy)
export const getMyAvailability = () => {
  return api.get("/reviewer/availability/me");
};

// Create availability slot
export const createAvailability = (data) => {
  return api.post("/reviewer/availability", data);
};

// Delete availability slot or break
export const deleteAvailability = (id) => {
  return api.delete(`/reviewer/availability/${id}`);
};

// Get my current status
export const getMyStatus = () => {
  return api.get("/reviewer/availability/status");
};

// Update my status (available, busy, dnd)
export const updateStatus = (status) => {
  return api.put("/reviewer/availability/status", { status });
};

// Create break block
export const createBreak = (data) => {
  return api.post("/reviewer/availability/breaks", data);
};