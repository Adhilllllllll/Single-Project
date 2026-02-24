import api from "../../api/axios";

export const loginApi = (data) =>
  api.post("/auth/login", data);
