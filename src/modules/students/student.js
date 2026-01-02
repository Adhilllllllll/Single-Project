// const mongoose = require("mongoose");

// const studentSchema = new mongoose.Schema(
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
//       trim: true,
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
//       default: true, // admin-created student
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

//     /* ---------------- ACADEMIC INFO ---------------- */

//     advisorId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User", // advisor
//       required: true,
//     },

//     departmentId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Department",
//       default: null,
//     },

//     batch: {
//       type: String,
//       trim: true,
//     },

//     course: {
//       type: String,
//       trim: true,
//     },
//   },
//   {
//     timestamps: true,
//   }
// );

// /* ---------------- INDEXES ---------------- */

// studentSchema.index({ email: 1 });
// studentSchema.index({ advisorId: 1 });
// studentSchema.index({ status: 1 });

// module.exports = mongoose.model("Student", studentSchema);

const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
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

    /* -------- ACADEMIC INFO -------- */

    advisorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      default: null,
    },

    batch: {
      type: String,
      trim: true,
    },

    course: {
      type: String,
      trim: true,
    },

    /* -------- PROFILE -------- */

    avatar: {
      type: String,
      default: null, // URL to profile picture
    },

    documents: [
      {
        filename: String,
        path: String,
        type: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

/* -------- INDEXES -------- */
// studentSchema.index({ email: 1 });
studentSchema.index({ advisorId: 1 });
studentSchema.index({ status: 1 });

module.exports = mongoose.model("Student", studentSchema);
