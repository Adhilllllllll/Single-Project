const mongoose = require("mongoose");

const reviewerAvailabilitySchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    dayOfWeek: {
      type: Number, // 0 = Sunday, 6 = Saturday
      required: true,
      min: 0,
      max: 6,
    },

    startTime: {
      type: String, // "09:00"
      required: true,
    },

    endTime: {
      type: String, // "11:00"
      required: true,
    },

    timezone: {
      type: String,
      default: "Asia/Kolkata",
    },

    isRecurring: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active",
    },

    notes: {
      type: String,
    },
  },
  { timestamps: true }
);

// Prevent duplicate slots
reviewerAvailabilitySchema.index(
  { reviewerId: 1, dayOfWeek: 1, startTime: 1, endTime: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "ReviewerAvailability",
  reviewerAvailabilitySchema
);
