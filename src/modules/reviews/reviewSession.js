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
      enum: ["pending", "scheduled", "accepted", "rejected", "completed", "scored", "cancelled"],
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

// === PHASE 2: Performance Indexes for Admin Dashboard ===
// Supports: getRecentActivity ($sort by createdAt), getReviewStats (status aggregations)
reviewSessionSchema.index({ createdAt: -1 });      // For recent activity sorting
reviewSessionSchema.index({ scheduledAt: -1 });    // For scheduled reviews queries
reviewSessionSchema.index({ status: 1 });          // For status-based filtering/grouping

// === PHASE 3: Compound Indexes for Aggregation Queries ===
// Supports: getPerformanceAnalytics, getReviewerDashboard $facet pipelines
reviewSessionSchema.index({ reviewer: 1, status: 1, updatedAt: -1 });     // Reviewer stats + timeliness
reviewSessionSchema.index({ reviewer: 1, scheduledAt: 1 });               // Reviewer upcoming reviews
reviewSessionSchema.index({ student: 1, status: 1, scheduledAt: -1 });    // Student progress + history

module.exports = mongoose.model("ReviewSession", reviewSessionSchema);

