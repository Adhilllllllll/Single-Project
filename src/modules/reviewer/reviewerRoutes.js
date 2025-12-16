const express = require("express");
const router = express.Router();

// TEMP placeholder
router.get("/health", (req, res) => {
  res.json({ message: "Reviewer module ready" });
});

module.exports = router;
