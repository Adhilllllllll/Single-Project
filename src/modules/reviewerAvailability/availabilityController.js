const ReviewerAvailability = require("./ReviewerAvailability");
const User = require("../users/User");

/* ======================================================
   CREATE AVAILABILITY (Reviewer only)
====================================================== */
exports.createAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { dayOfWeek, startTime, endTime, isRecurring, notes } = req.body;

    if (
      dayOfWeek === undefined ||
      !startTime ||
      !endTime
    ) {
      return res.status(400).json({
        message: "dayOfWeek, startTime and endTime are required",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "startTime must be before endTime",
      });
    }

    const slot = await ReviewerAvailability.create({
      reviewerId,
      dayOfWeek,
      startTime,
      endTime,
      isRecurring,
      notes,
    });

    return res.status(201).json({
      message: "Availability created",
      availability: slot,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Availability slot already exists",
      });
    }

    console.error("Create Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET MY AVAILABILITY
====================================================== */
exports.getMyAvailability = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const reviewerId = req.user.id;

    const slots = await ReviewerAvailability.find({ reviewerId }).sort({
      dayOfWeek: 1,
      startTime: 1,
    });

    return res.json(slots);
  } catch (err) {
    console.error("Get Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   DELETE AVAILABILITY
====================================================== */
exports.deleteAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { id } = req.params;

    const slot = await ReviewerAvailability.findOneAndDelete({
      _id: id,
      reviewerId,
    });

    if (!slot) {
      return res.status(404).json({
        message: "Availability not found",
      });
    }

    return res.json({
      message: "Availability deleted",
    });
  } catch (err) {
    console.error("Delete Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET MY STATUS (Reviewer only)
====================================================== */
exports.getMyStatus = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const user = await User.findById(reviewerId).select("reviewerStatus");

    return res.json({
      status: user?.reviewerStatus || "available",
    });
  } catch (err) {
    console.error("Get Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   UPDATE MY STATUS (Reviewer only)
====================================================== */
exports.updateMyStatus = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { status } = req.body;

    if (!["available", "busy", "dnd"].includes(status)) {
      return res.status(400).json({
        message: "Invalid status. Must be: available, busy, or dnd",
      });
    }

    await User.findByIdAndUpdate(reviewerId, { reviewerStatus: status });

    return res.json({
      message: "Status updated",
      status,
    });
  } catch (err) {
    console.error("Update Status Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   CREATE BREAK BLOCK (Reviewer only)
====================================================== */
exports.createBreak = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { dayOfWeek, startTime, endTime, label } = req.body;

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return res.status(400).json({
        message: "dayOfWeek, startTime and endTime are required",
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "startTime must be before endTime",
      });
    }

    const breakBlock = await ReviewerAvailability.create({
      reviewerId,
      dayOfWeek,
      startTime,
      endTime,
      slotType: "break",
      label: label || "Break",
      isRecurring: true,
    });

    return res.status(201).json({
      message: "Break created",
      break: breakBlock,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Break block already exists for this time",
      });
    }
    console.error("Create Break Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET ALL (slots + breaks) for Weekly Grid
====================================================== */
exports.getAllAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;

    const slots = await ReviewerAvailability.find({ reviewerId }).sort({
      dayOfWeek: 1,
      startTime: 1,
    });

    // Separate slots and breaks
    const availability = slots.filter(s => s.slotType !== "break");
    const breaks = slots.filter(s => s.slotType === "break");

    return res.json({
      availability,
      breaks,
    });
  } catch (err) {
    console.error("Get All Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
