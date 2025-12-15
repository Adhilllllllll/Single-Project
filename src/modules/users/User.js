const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },

    email: { type: String, required: true, unique: true, lowercase: true },

    passwordHash: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "advisor", "reviewer"],
      required: true,
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    mustChangePassword: {
      type: Boolean,
      default: false,
    },

    passwordExpiresAt: { type: Date, default: null },

    passwordChangedAt: { type: Date, default: null },

    isSuperAdmin: { type: Boolean, default: false },

    phone: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
