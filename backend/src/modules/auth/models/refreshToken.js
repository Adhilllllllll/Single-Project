const mongoose = require("mongoose");
const { Schema } = mongoose;

const refreshTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    tokenHash: { type: String, required: true }, // hashed/opaque token
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
    revoked: { type: Boolean, default: false },
    replacedByToken: { type: String, default: null },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

refreshTokenSchema.virtual("isExpired").get(function () {
  return Date.now() >= new Date(this.expiresAt).getTime();
});

module.exports = mongoose.model("RefreshToken", refreshTokenSchema);
