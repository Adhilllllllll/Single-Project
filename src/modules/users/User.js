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

    /* -------- ROLE -------- */

    role: {
      type: String,
      enum: ["admin", "advisor", "reviewer"],
      required: true,
    },

    domain: {
      type: String, // ex: Full Stack, Backend, UI
    },

    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

/* -------- INDEXES -------- */
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ status: 1 });

module.exports = mongoose.model("User", userSchema);
