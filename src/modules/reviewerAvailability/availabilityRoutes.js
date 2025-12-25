const router = require("express").Router();
const availabilityController = require("./availabilityController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Reviewer only

// Get all availability (slots + breaks) for Weekly Grid
router.get(
  "/all",
  authMiddleware("reviewer"),
  availabilityController.getAllAvailability
);

// Status management
router.get(
  "/status",
  authMiddleware("reviewer"),
  availabilityController.getMyStatus
);

router.put(
  "/status",
  authMiddleware("reviewer"),
  availabilityController.updateMyStatus
);

// Availability slots
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

// Break blocks
router.post(
  "/breaks",
  authMiddleware("reviewer"),
  availabilityController.createBreak
);

module.exports = router;

