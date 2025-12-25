const mongoose = require("mongoose");

const reviewSessionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student", // IMPORTANT: students are a separate collection
      required: true,
    },

    advisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    week: {
      type: Number,
      required: true,
      min: 1,
    },

    status: {
      type: String,
      enum: ["pending", "scheduled", "accepted", "rejected", "completed", "cancelled"],
      default: "pending",
    },

    scheduledAt: {
      type: Date,
      required: true,
    },

    mode: {
      type: String,
      enum: ["online", "offline"],
      required: true,
    },

    meetingLink: {
      type: String,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    marks: {
      type: Number,
      min: 0,
      max: 10,
    },

    feedback: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// Indexes
reviewSessionSchema.index({ advisor: 1 });
reviewSessionSchema.index({ reviewer: 1 });
reviewSessionSchema.index({ student: 1, week: 1 });

module.exports = mongoose.model("ReviewSession", reviewSessionSchema);
