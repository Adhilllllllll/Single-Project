// const mongoose = require("mongoose");

// const userSchema = new mongoose.Schema(
//   {
//     /* ---------------- BASIC IDENTITY ---------------- */

//     name: {
//       type: String,
//       required: true,
//       trim: true,
//     },

//     email: {
//       type: String,
//       required: true,
//       unique: true,
//       lowercase: true,
//       index: true,
//     },

//     phone: {
//       type: String,
//       trim: true,
//     },

//     /* ---------------- AUTH & SECURITY ---------------- */

//     passwordHash: {
//       type: String,
//       required: true,
//     },

//     mustChangePassword: {
//       type: Boolean,
//       default: false,
//     },

//     passwordExpiresAt: {
//       type: Date,
//       default: null,
//     },

//     passwordChangedAt: {
//       type: Date,
//       default: null,
//     },

//     status: {
//       type: String,
//       enum: ["active", "inactive"],
//       default: "active",
//     },

//     /* ---------------- ROLE MANAGEMENT ---------------- */

//     // Current active role
//     role: {
//       type: String,
//       enum: ["admin", "advisor", "reviewer", "student"],
//       required: true,
//     },

//     // Roles user has ever had (for future role switching)
//     roles: {
//       type: [String],
//       enum: ["admin", "advisor", "reviewer", "student"],
//       default: [],
//     },

//     isSuperAdmin: {
//       type: Boolean,
//       default: false,
//     },

//     /* ---------------- ROLE PROFILES ---------------- */

//     // STUDENT PROFILE
//     student: {
//       mentorId: {
//         type: mongoose.Schema.Types.ObjectId,
//         ref: "User",
//         default: null,
//       },

//       currentWeek: {
//         type: Number,
//         default: 1,
//       },

//       weekTasks: [
//         {
//           week: {
//             type: Number,
//             required: true,
//           },
//           tasks: [
//             {
//               title: {
//                 type: String,
//                 required: true,
//               },
//               status: {
//                 type: String,
//                 enum: ["pending", "completed"],
//                 default: "pending",
//               },
//             },
//           ],
//         },
//       ],
//     },

//     // ADVISOR / MENTOR PROFILE
//     advisor: {
//       domains: {
//         type: [String],
//         default: [],
//       },

//       skills: {
//         type: [String],
//         enum: ["NODE", "GO", "PYTHON"],
//         default: [],
//       },

//       assignedStudents: [
//         {
//           type: mongoose.Schema.Types.ObjectId,
//           ref: "User",
//         },
//       ],
//     },

//     // REVIEWER PROFILE
//     reviewer: {
//       expertise: {
//         type: [String],
//         enum: ["NODE", "GO", "PYTHON"],
//         default: [],
//       },

//       assignedWeeks: {
//         type: [Number],
//         default: [],
//       },

//       profileCompleted: {
//         type: Boolean,
//         default: false,
//       },
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// /* ---------------- INDEXES ---------------- */

// // Fast lookups
// userSchema.index({ email: 1 });
// userSchema.index({ role: 1 });
// userSchema.index({ status: 1 });

// module.exports = mongoose.model("User", userSchema);

const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    /* -------- BASIC IDENTITY -------- */

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    /* -------- AUTH & SECURITY -------- */

    passwordHash: {
      type: String,
      required: true,
    },

    mustChangePassword: {
      type: Boolean,
      default: true,
    },

    passwordExpiresAt: {
      type: Date,
      default: null,
    },

    passwordChangedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    resetPasswordToken: {
      type: String,
      default: null,
    },

    resetPasswordExpires: {
      type: Date,
      default: null,
    },

    /* -------- ROLE -------- */

    role: {
      type: String,
      enum: ["admin", "advisor", "reviewer"],
      required: true,
    },

    domain: {
      type: String, // ex: Full Stack, Backend, UI
    },

    avatar: {
      type: String, // Path to avatar image
    },

    about: {
      type: String, // Bio/description
      maxLength: 500,
    },

    isSuperAdmin: {
      type: Boolean,
      default: false,
    },

    // Reviewer-specific: current availability status
    reviewerStatus: {
      type: String,
      enum: ["available", "busy", "dnd"],
      default: "available",
    },

    // === FCM Push Notification Tokens ===
    // Supports multiple devices per user
    fcmTokens: [{
      token: {
        type: String,
        required: true,
      },
      platform: {
        type: String,
        enum: ["web", "android", "ios"],
        default: "web",
      },
      lastUsedAt: {
        type: Date,
        default: Date.now,
      },
      userAgent: {
        type: String,
      },
    }],

    // === Notification Preferences ===
    // Controls push notification delivery (socket always works)
    notificationPreferences: {
      // Global push notification toggle
      pushEnabled: {
        type: Boolean,
        default: true,
      },
      // Muted conversations - no push for these chats
      mutedChats: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
      }],
    },
  },
  { timestamps: true }
);

/* -------- INDEXES -------- */
// NOTE: email index NOT needed here - `unique: true` on field already creates one
// userSchema.index({ email: 1 });   // REMOVED: Duplicate (Mongoose warning fix)
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

// === PHASE 2: Performance Index for Admin Dashboard ===
// Supports: getAllUsers ($sort by createdAt)
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model("User", userSchema);
