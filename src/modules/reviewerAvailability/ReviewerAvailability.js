const mongoose = require("mongoose");

const reviewerAvailabilitySchema = new mongoose.Schema(
  {
    reviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Type of availability: recurring (weekly) or specific (date-based)
    availabilityType: {
      type: String,
      enum: ["recurring", "specific"],
      default: "recurring",
    },

    // For recurring slots (dayOfWeek-based)
    dayOfWeek: {
      type: Number, // 0 = Sunday, 6 = Saturday
      min: 0,
      max: 6,
      required: function () { return this.availabilityType === "recurring"; },
    },

    // For specific date slots
    specificDate: {
      type: Date,
      required: function () { return this.availabilityType === "specific"; },
      index: true,
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

    // Type: 'slot' for availability, 'break' for break blocks
    slotType: {
      type: String,
      enum: ["slot", "break"],
      default: "slot",
    },

    // Label for break blocks (e.g., "Lunch Break")
    label: {
      type: String,
    },
  },
  { timestamps: true }
);

// ============================================================
// PARTIAL UNIQUE INDEXES
// These prevent duplicate slots while allowing both recurring
// and specific date availability types to coexist properly
// ============================================================

// Index 1: For recurring slots (dayOfWeek-based)
// Ensures no duplicate recurring slots for same reviewer, day, and time
reviewerAvailabilitySchema.index(
  { reviewerId: 1, availabilityType: 1, dayOfWeek: 1, startTime: 1, endTime: 1 },
  {
    unique: true,
    partialFilterExpression: { availabilityType: "recurring" },
    name: "unique_recurring_slot"
  }
);

// Index 2: For specific date slots
// Ensures no duplicate specific date slots for same reviewer, date, and time
reviewerAvailabilitySchema.index(
  { reviewerId: 1, availabilityType: 1, specificDate: 1, startTime: 1, endTime: 1 },
  {
    unique: true,
    partialFilterExpression: { availabilityType: "specific" },
    name: "unique_specific_date_slot"
  }
);

// Index for faster queries by reviewer
reviewerAvailabilitySchema.index({ reviewerId: 1, availabilityType: 1 });

module.exports = mongoose.model(
  "ReviewerAvailability",
  reviewerAvailabilitySchema
);
