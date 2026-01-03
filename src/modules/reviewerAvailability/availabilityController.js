const ReviewerAvailability = require("./ReviewerAvailability");
const User = require("../users/User");
const ReviewSession = require("../reviews/reviewSession");

/* ======================================================
   CREATE AVAILABILITY (Reviewer only)
   Supports both recurring (weekly) and specific date slots
====================================================== */
exports.createAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const { availabilityType = "recurring", dayOfWeek, specificDate, startTime, endTime, isRecurring, notes } = req.body;

    // Validate required fields based on type
    if (availabilityType === "recurring") {
      if (dayOfWeek === undefined || !startTime || !endTime) {
        return res.status(400).json({
          message: "dayOfWeek, startTime and endTime are required for recurring slots",
        });
      }
    } else if (availabilityType === "specific") {
      if (!specificDate || !startTime || !endTime) {
        return res.status(400).json({
          message: "specificDate, startTime and endTime are required for specific date slots",
        });
      }
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "startTime must be before endTime",
      });
    }

    // Check for overlapping slots
    const query = { reviewerId, startTime: { $lt: endTime }, endTime: { $gt: startTime } };
    if (availabilityType === "recurring") {
      query.availabilityType = "recurring";
      query.dayOfWeek = dayOfWeek;
    } else {
      query.availabilityType = "specific";
      query.specificDate = new Date(specificDate);
    }

    const existingSlot = await ReviewerAvailability.findOne(query);
    if (existingSlot) {
      return res.status(409).json({
        message: "Overlapping slot exists for this time",
      });
    }

    const slotData = {
      reviewerId,
      availabilityType,
      startTime,
      endTime,
      isRecurring: availabilityType === "recurring",
      notes,
    };

    if (availabilityType === "recurring") {
      slotData.dayOfWeek = dayOfWeek;
    } else {
      slotData.specificDate = new Date(specificDate);
    }

    const slot = await ReviewerAvailability.create(slotData);

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
      availabilityType: 1,
      dayOfWeek: 1,
      specificDate: 1,
      startTime: 1,
    });

    // Separate by type
    const recurring = slots.filter(s => s.availabilityType === "recurring");
    const specific = slots.filter(s => s.availabilityType === "specific");

    return res.json({
      recurring,
      specific,
      all: slots,
    });
  } catch (err) {
    console.error("Get Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET AVAILABILITY BY DATE (For Advisor scheduling)
   Returns available slots for a specific date
   Filters out slots that already have a scheduled review
====================================================== */
exports.getAvailabilityByDate = async (req, res) => {
  try {
    const { date, reviewerId } = req.query;

    if (!date) {
      return res.status(400).json({ message: "Date is required" });
    }

    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay(); // 0-6

    // Create date range for the target date (start and end of day)
    const dayStart = new Date(targetDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(targetDate);
    dayEnd.setHours(23, 59, 59, 999);

    // Build query for availability
    const query = {
      status: "active",
      slotType: "slot",
      $or: [
        // Recurring slots for this day of week
        { availabilityType: "recurring", dayOfWeek },
        // Specific date slots for this exact date
        {
          availabilityType: "specific",
          specificDate: { $gte: dayStart, $lte: dayEnd },
        },
      ],
    };

    if (reviewerId) {
      query.reviewerId = reviewerId;
    }

    const slots = await ReviewerAvailability.find(query)
      .populate("reviewerId", "name email domain avatar")
      .sort({ startTime: 1 });

    // Get all scheduled/pending reviews for this date to filter out booked slots
    const existingReviews = await ReviewSession.find({
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["scheduled", "pending"] },
    }).select("reviewer scheduledAt");

    // Get current time for filtering out past slots
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const isToday = dayStart.toDateString() === now.toDateString();

    // Filter out slots that are already booked OR have already passed (for today)
    const availableSlots = slots.filter((slot) => {
      // If target date is today, exclude slots where start time has passed
      if (isToday && slot.startTime <= currentTimeStr) {
        return false;
      }

      // Check if this slot's time is already booked for this reviewer
      const slotReviewerId = slot.reviewerId?._id?.toString() || slot.reviewerId?.toString();

      const isBooked = existingReviews.some((review) => {
        const reviewReviewerId = review.reviewer?.toString();
        if (slotReviewerId !== reviewReviewerId) return false;

        // Compare times - the review is at scheduledAt time
        const reviewTime = new Date(review.scheduledAt);
        const reviewHour = reviewTime.getHours();
        const reviewMinutes = reviewTime.getMinutes();
        const reviewTimeStr = `${String(reviewHour).padStart(2, "0")}:${String(reviewMinutes).padStart(2, "0")}`;

        // Check if review time falls within slot time
        return reviewTimeStr >= slot.startTime && reviewTimeStr < slot.endTime;
      });

      return !isBooked;
    });

    return res.json(availableSlots);
  } catch (err) {
    console.error("Get Availability By Date Error:", err);
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
