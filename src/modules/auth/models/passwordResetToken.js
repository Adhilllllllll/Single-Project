const mongoose = require("mongoose");
const { Schema } = mongoose;

// changed schema fields to match authService usage (userId and tokenHash)
const passwordResetTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true }, // hashed token
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PasswordResetToken", passwordResetTokenSchema);
