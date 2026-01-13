const ReviewerAvailability = require("./ReviewerAvailability");
const User = require("../users/User");
const ReviewSession = require("../reviews/reviewSession");

// Constants
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUSES = ["available", "busy", "dnd"];

/* ======================================================
   INTERNAL HELPER FUNCTIONS
====================================================== */

// Response helpers
const sendSuccess = (res, data, message = "Success", status = 200) => {
  res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500, extra = {}) => {
  res.status(status).json({ message, ...extra });
};

const handleError = (res, err, context) => {
  // Handle MongoDB duplicate key error
  if (err.code === 11000) {
    return sendError(res, "This time slot already exists", 409, {
      conflictType: "duplicate",
      code: "DUPLICATE_KEY"
    });
  }
  console.error(`${context} Error:`, err);
  sendError(res, "Server error", 500);
};

// Time validation helpers
const isValidTimeFormat = (time) => TIME_REGEX.test(time);
const isValidDateFormat = (date) => DATE_REGEX.test(date);


/* ======================================================
   CREATE AVAILABILITY (Reviewer only)
   Supports both:
   - Simple format: { date, startTime, endTime }
   - Recurring format: { availabilityType: "recurring", dayOfWeek, startTime, endTime }
====================================================== */
exports.createAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;

    // Debug logging
    console.log("📅 Create Availability Request:");
    console.log("   User ID:", reviewerId);
    console.log("   Body:", JSON.stringify(req.body, null, 2));

    const {
      // New simple format
      date,
      // Legacy recurring format
      availabilityType,
      dayOfWeek,
      specificDate,
      // Common fields
      startTime,
      endTime,
      isRecurring,
      notes
    } = req.body;

    // Validate required time fields
    if (!startTime || !endTime) {
      return res.status(400).json({
        message: "startTime and endTime are required",
        received: { startTime, endTime },
      });
    }

    // Validate time format (HH:mm)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return res.status(400).json({
        message: "Invalid time format. Use HH:mm (e.g., 09:00, 14:30)",
        received: { startTime, endTime },
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        message: "startTime must be before endTime",
        received: { startTime, endTime },
      });
    }

    // Determine slot type and prepare data
    let slotData = {
      reviewerId,
      startTime,
      endTime,
      notes,
    };

    // Simple date-based format (new format)
    if (date) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        return res.status(400).json({
          message: "Invalid date format. Use YYYY-MM-DD",
          received: { date },
        });
      }

      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          message: "Invalid date value",
          received: { date },
        });
      }

      // Validate that date is not in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate < today) {
        return res.status(400).json({
          message: "Cannot create availability for past dates",
          received: { date },
          today: today.toISOString().split('T')[0],
        });
      }

      slotData.availabilityType = "specific";
      slotData.specificDate = parsedDate;
      slotData.isRecurring = false;

      // Recurring weekly format (legacy format)
    } else if (availabilityType === "recurring" || dayOfWeek !== undefined) {
      // dayOfWeek can be 0 (Sunday), so check explicitly
      if (dayOfWeek === null || dayOfWeek === undefined || dayOfWeek === "") {
        return res.status(400).json({
          message: "dayOfWeek is required for recurring slots (0=Sunday to 6=Saturday)",
          received: { dayOfWeek },
        });
      }

      const dow = parseInt(dayOfWeek, 10);
      if (isNaN(dow) || dow < 0 || dow > 6) {
        return res.status(400).json({
          message: "dayOfWeek must be 0-6 (0=Sunday, 6=Saturday)",
          received: { dayOfWeek },
        });
      }

      slotData.availabilityType = "recurring";
      slotData.dayOfWeek = dow;
      slotData.isRecurring = true;

      // Specific date format (legacy format)
    } else if (availabilityType === "specific" || specificDate) {
      if (!specificDate) {
        return res.status(400).json({
          message: "specificDate is required for specific date slots",
          received: { specificDate },
        });
      }

      slotData.availabilityType = "specific";
      slotData.specificDate = new Date(specificDate);
      slotData.isRecurring = false;

    } else {
      return res.status(400).json({
        message: "Either 'date' (YYYY-MM-DD) or 'dayOfWeek' (0-6) is required",
        received: req.body,
      });
    }

    // Check for overlapping slots
    const overlapQuery = {
      reviewerId,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    };

    if (slotData.availabilityType === "recurring") {
      overlapQuery.availabilityType = "recurring";
      overlapQuery.dayOfWeek = slotData.dayOfWeek;
    } else {
      // For specific dates, compare with date range (same day)
      const dateToCheck = new Date(slotData.specificDate);
      const dayStart = new Date(dateToCheck);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dateToCheck);
      dayEnd.setHours(23, 59, 59, 999);

      overlapQuery.availabilityType = "specific";
      overlapQuery.specificDate = { $gte: dayStart, $lte: dayEnd };
    }

    console.log("🔍 Checking for overlap with query:", JSON.stringify(overlapQuery, null, 2));

    const existingSlot = await ReviewerAvailability.findOne(overlapQuery);
    if (existingSlot) {
      console.log("⚠️ Found conflicting slot:", existingSlot._id);

      // Determine if it's an exact duplicate or just overlapping
      const isExactDuplicate = existingSlot.startTime === startTime && existingSlot.endTime === endTime;

      // Format user-friendly message
      let userMessage;
      let conflictType;

      if (isExactDuplicate) {
        userMessage = `This time slot already exists (${startTime} - ${endTime})`;
        conflictType = "duplicate";
      } else {
        userMessage = `This time slot overlaps with an existing availability (${existingSlot.startTime} - ${existingSlot.endTime})`;
        conflictType = "overlap";
      }

      return res.status(409).json({
        message: userMessage,
        conflictType,
        code: "SLOT_CONFLICT",
        existing: {
          id: existingSlot._id,
          startTime: existingSlot.startTime,
          endTime: existingSlot.endTime,
          date: existingSlot.specificDate || null,
          dayOfWeek: existingSlot.dayOfWeek,
        },
        requested: {
          startTime,
          endTime,
        },
      });
    }

    const slot = await ReviewerAvailability.create(slotData);
    console.log("✅ Availability created:", slot._id);

    return res.status(201).json({
      message: "Availability created successfully",
      availability: slot,
    });
  } catch (err) {
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      return res.status(409).json({
        message: "This time slot already exists",
        conflictType: "duplicate",
        code: "DUPLICATE_KEY",
      });
    }

    console.error("❌ Create Availability Error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
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

    console.log("📅 Get Availability By Date Request:");
    console.log("   Date:", date);
    console.log("   ReviewerId filter:", reviewerId || "none");

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

    console.log("   Day of Week:", dayOfWeek, DAY_NAMES[dayOfWeek] || "");
    console.log("   Day Range:", dayStart.toISOString(), "to", dayEnd.toISOString());

    // Build query for availability - less restrictive to catch all slots
    const query = {
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

    // Only filter by slotType if the field exists (exclude breaks)
    query.slotType = { $ne: "break" };

    if (reviewerId) {
      query.reviewerId = reviewerId;
    }

    console.log("   Query:", JSON.stringify(query, null, 2));

    const slots = await ReviewerAvailability.find(query)
      .populate("reviewerId", "name email domain avatar")
      .sort({ startTime: 1 });

    console.log("   Found slots:", slots.length);
    slots.forEach((s, i) => {
      console.log(`     [${i}] Type: ${s.availabilityType}, Day: ${s.dayOfWeek}, Date: ${s.specificDate}, Time: ${s.startTime}-${s.endTime}`);
    });

    // Get all scheduled/pending reviews for this date to filter out booked slots
    const existingReviews = await ReviewSession.find({
      scheduledAt: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ["scheduled", "pending"] },
    }).select("reviewer scheduledAt");

    // Get current time for filtering out past slots
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const isToday = dayStart.toDateString() === now.toDateString();

    // Return slots with isBooked flag (filter out past slots for today only)
    const slotsWithStatus = slots
      .filter((slot) => {
        // If target date is today, exclude slots where start time has passed
        if (isToday && slot.startTime <= currentTimeStr) {
          return false;
        }
        return true;
      })
      .map((slot) => {
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

        // Return slot with isBooked flag
        return { ...slot.toObject(), isBooked };
      });

    return res.json(slotsWithStatus);
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
