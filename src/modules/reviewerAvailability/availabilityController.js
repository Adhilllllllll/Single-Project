const ReviewerAvailability = require("./ReviewerAvailability");
const User = require("../users/User");
const ReviewSession = require("../reviews/reviewSession");

// Constants
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
   
   MONGODB-CENTRIC REFACTOR (Phase 2)
   ────────────────────────────────────────────────────────
   BEFORE: find() + 2x .filter() for type separation
   AFTER:  Single aggregation with $facet for parallel filters
====================================================== */
exports.getMyAvailability = async (req, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const reviewerId = req.user.id;
    const mongoose = require("mongoose");

    // === SINGLE AGGREGATION WITH $facet ===
    // Replaces: find() + 2x .filter()
    const result = await ReviewerAvailability.aggregate([
      // Stage 1: Match all slots for this reviewer
      { $match: { reviewerId: new mongoose.Types.ObjectId(reviewerId) } },

      // Stage 2: Sort (applied before $facet)
      { $sort: { availabilityType: 1, dayOfWeek: 1, specificDate: 1, startTime: 1 } },

      // Stage 3: $facet for parallel filtering
      {
        $facet: {
          recurring: [
            { $match: { availabilityType: "recurring" } }
          ],
          specific: [
            { $match: { availabilityType: "specific" } }
          ],
          all: []  // No filter = all documents
        }
      }
    ]);

    // $facet returns array with single object
    const { recurring, specific, all } = result[0] || { recurring: [], specific: [], all: [] };

    return res.json({ recurring, specific, all });
  } catch (err) {
    console.error("Get Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/* ======================================================
   GET AVAILABILITY BY DATE (For Advisor scheduling)
   
   MONGODB-CENTRIC REFACTOR (Phase 2)
   ────────────────────────────────────────────────────────
   BEFORE: 2 DB queries + JS .filter() + .map() + .some()
   AFTER:  1 aggregation pipeline with $lookup + $addFields
   
   Performance:
   - O(n×m) nested JS loop → O(n log m) indexed $lookup
   - Memory: Only result set loaded, not all slots + reviews
   
   Pipeline Stages:
   1. $match - Filter slots by date/dayOfWeek
   2. $lookup - Join reviewer info
   3. $unwind - Flatten reviewer array
   4. $lookup - Find booked reviews for this slot
   5. $addFields - Compute isBooked + filter past slots
   6. $match - Remove past slots (if today)
   7. $project - Clean up internal fields
   8. $sort - Order by startTime
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

    // Current time for filtering past slots
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const isToday = dayStart.toDateString() === now.toDateString();

    // Build base match conditions
    const matchConditions = {
      $or: [
        // Recurring slots for this day of week
        { availabilityType: "recurring", dayOfWeek: dayOfWeek },
        // Specific date slots for this exact date
        { availabilityType: "specific", specificDate: { $gte: dayStart, $lte: dayEnd } }
      ],
      slotType: { $ne: "break" }
    };

    // Add reviewer filter if provided
    if (reviewerId) {
      const mongoose = require("mongoose");
      matchConditions.reviewerId = new mongoose.Types.ObjectId(reviewerId);
    }

    // === SINGLE AGGREGATION PIPELINE ===
    // Replaces: find() + find() + .filter() + .map() + .some()
    const pipeline = [
      // Stage 1: Match availability slots
      { $match: matchConditions },

      // Stage 2: Lookup reviewer info (replaces .populate())
      {
        $lookup: {
          from: "users",
          localField: "reviewerId",
          foreignField: "_id",
          pipeline: [{ $project: { name: 1, email: 1, domain: 1, avatar: 1 } }],
          as: "reviewerInfo"
        }
      },

      // Stage 3: Unwind reviewer (convert array to object)
      { $unwind: { path: "$reviewerInfo", preserveNullAndEmptyArrays: true } },

      // Stage 4: Lookup booked reviews for this slot's reviewer on this date
      // This replaces the JS .some() nested loop
      {
        $lookup: {
          from: "reviewsessions",
          let: {
            slotReviewerId: "$reviewerId",
            slotStart: "$startTime",
            slotEnd: "$endTime"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$reviewer", "$$slotReviewerId"] },
                    { $gte: ["$scheduledAt", dayStart] },
                    { $lte: ["$scheduledAt", dayEnd] },
                    { $in: ["$status", ["scheduled", "pending"]] }
                  ]
                }
              }
            },
            // Compute review time string for comparison
            {
              $addFields: {
                reviewTimeStr: {
                  $dateToString: {
                    format: "%H:%M",
                    date: "$scheduledAt",
                    timezone: "Asia/Kolkata"
                  }
                }
              }
            },
            // Match only reviews that fall within this slot's time
            {
              $match: {
                $expr: {
                  $and: [
                    { $gte: ["$reviewTimeStr", "$$slotStart"] },
                    { $lt: ["$reviewTimeStr", "$$slotEnd"] }
                  ]
                }
              }
            },
            { $limit: 1 } // Only need to know if ANY exist
          ],
          as: "_bookedReviews"
        }
      },

      // Stage 5: Add computed fields
      {
        $addFields: {
          // isBooked = true if any matching review exists
          isBooked: { $gt: [{ $size: "$_bookedReviews" }, 0] },
          // isPast = true if today and startTime <= currentTime
          _isPast: isToday ? { $lte: ["$startTime", currentTimeStr] } : false,
          // Restructure reviewerId to match populate() output
          reviewerId: {
            _id: "$reviewerId",
            name: "$reviewerInfo.name",
            email: "$reviewerInfo.email",
            domain: "$reviewerInfo.domain",
            avatar: "$reviewerInfo.avatar"
          }
        }
      },

      // Stage 6: Filter out past slots (only if today)
      { $match: { _isPast: { $ne: true } } },

      // Stage 7: Clean up internal fields
      {
        $project: {
          _bookedReviews: 0,
          _isPast: 0,
          reviewerInfo: 0
        }
      },

      // Stage 8: Sort by start time
      { $sort: { startTime: 1 } }
    ];

    const slots = await ReviewerAvailability.aggregate(pipeline);

    return res.json(slots);
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
   
   MONGODB-CENTRIC REFACTOR (Phase 2)
   ────────────────────────────────────────────────────────
   BEFORE: find() + 2x .filter() for slots/breaks separation
   AFTER:  Single aggregation with $facet for parallel filters
====================================================== */
exports.getAllAvailability = async (req, res) => {
  try {
    const reviewerId = req.user.id;
    const mongoose = require("mongoose");

    // === SINGLE AGGREGATION WITH $facet ===
    // Replaces: find() + 2x .filter()
    const result = await ReviewerAvailability.aggregate([
      // Stage 1: Match all items for this reviewer
      { $match: { reviewerId: new mongoose.Types.ObjectId(reviewerId) } },

      // Stage 2: Sort before $facet
      { $sort: { dayOfWeek: 1, startTime: 1 } },

      // Stage 3: $facet for parallel filtering
      {
        $facet: {
          availability: [
            { $match: { slotType: { $ne: "break" } } }
          ],
          breaks: [
            { $match: { slotType: "break" } }
          ]
        }
      }
    ]);

    // $facet returns array with single object
    const { availability, breaks } = result[0] || { availability: [], breaks: [] };

    return res.json({ availability, breaks });
  } catch (err) {
    console.error("Get All Availability Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
