const ReviewerAvailability = require("./ReviewerAvailability");

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
