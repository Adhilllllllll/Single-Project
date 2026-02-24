import api from "../../api/axios";

export const fetchAdminCounts = () =>
  api.get("/admin/dashboard-counts");

export const createUser = (userData) =>
  api.post("/admin/create-user", userData);

export const fetchAdvisors = () =>
  api.get("/users/advisors");
