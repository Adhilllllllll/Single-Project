const router = require("express").Router();
const availabilityController = require("./availabilityController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Reviewer only
router.post(
  "/",
  authMiddleware("reviewer"),
  availabilityController.createAvailability
);

router.get(
  "/me",
  authMiddleware("reviewer"),
  availabilityController.getMyAvailability
);

router.delete(
  "/:id",
  authMiddleware("reviewer"),
  availabilityController.deleteAvailability
);

module.exports = router;
