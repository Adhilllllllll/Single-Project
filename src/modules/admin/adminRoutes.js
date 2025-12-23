const router = require("express").Router();
const authMiddleware = require("../../middlewares/authMiddleware");
const adminController = require("./adminController");

router.get(
  "/dashboard-counts",
  authMiddleware("admin"),
  adminController.getDashboardCounts
);

router.post(
  "/create-user",
  authMiddleware("admin"),
  adminController.createUser
);

module.exports = router;
