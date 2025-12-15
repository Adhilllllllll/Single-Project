const bcrypt = require("bcrypt");
const { generateRandomToken, hashToken } = require("../../utils/jwt");
const User = require("../users/User");
// const PasswordResetToken = require("../models/passwordResetToken");
// const RefreshToken = require("../models/refreshToken");
const { sendInitialPasswordEmail, sendPasswordResetEmail } = require("./emailService");

// Helper: generate strong temporary password
function generateTempPassword() {
  const rand = generateRandomToken(6); // hex 12 chars
  return `Rms@${rand.slice(0,8)}`;
}

async function adminCreateUser({ name, email, role }) {
  // validate role
  if (!["advisor","reviewer","student"].includes(role)) throw new Error("Invalid role");

  const existing = await User.findOne({ email });
  if (existing) throw new Error("User already exists");

  const tempPassword = generateTempPassword();
  const hashed = await bcrypt.hash(tempPassword, 10);
  const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days

  const user = await User.create({
    name, email, passwordHash: hashed, role,
    mustChangePassword: true, passwordExpiresAt: expiresAt
  });

  // send email (don't await to block? we await to surface errors)
  await sendInitialPasswordEmail(user, tempPassword, expiresAt);
  return user;
}

async function createPasswordResetToken(user) {
  const token = generateRandomToken(32); // long random
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // remove previous tokens for user
  await PasswordResetToken.deleteMany({ userId: user._id });

  await PasswordResetToken.create({ userId: user._id, tokenHash, expiresAt });

  // send email with plain token (link)
  await sendPasswordResetEmail(user, token);
  return token;
}

async function verifyAndResetPassword(token, newPassword) {
  const tokenHash = hashToken(token);
  const record = await PasswordResetToken.findOne({ tokenHash });
  if (!record || record.expiresAt < new Date()) throw new Error("Token invalid or expired");

  const user = await User.findById(record.userId);
  if (!user) throw new Error("User not found");

  user.passwordHash = await bcrypt.hash(newPassword, 10);
  user.mustChangePassword = false;
  user.passwordExpiresAt = null;
  user.passwordChangedAt = new Date();

  // revoke existing refresh tokens
  await RefreshToken.updateMany({ userId: user._id }, { revoked: true });

  await user.save();
  await PasswordResetToken.deleteMany({ userId: user._id });
  return user;
}

async function createRefreshTokenForUser(user, meta = {}) {
  // create a random token, store hashed
  const plain = generateRandomToken(48);
  const tokenHash = hashToken(plain);

  // prefer env REFRESH_TOKEN_EXPIRES_DAYS or REFRESH_TOKEN_EXPIRES, fallback to 7 days
  const days =
    parseInt(process.env.REFRESH_TOKEN_EXPIRES_DAYS, 10) ||
    (process.env.REFRESH_TOKEN_EXPIRES ? parseInt(process.env.REFRESH_TOKEN_EXPIRES, 10) : 7);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  const doc = await RefreshToken.create({
    userId: user._id,
    tokenHash,
    userAgent: meta.userAgent || meta.ua || null,
    ipAddress: meta.ip || meta.ipAddress || null,
    expiresAt
  });

  // return plain token to client
  return { plainToken: plain, dbRecord: doc, expiresAt };
}

async function verifyRefreshToken(plainToken) {
  const tokenHash = hashToken(plainToken);
  const record = await RefreshToken.findOne({ tokenHash });
  if (!record || record.expiresAt < new Date() || record.revoked) throw new Error("Refresh token invalid");
  const user = await User.findById(record.userId);
  if (!user) throw new Error("User not found");
  return { record, user };
}

module.exports = {
  adminCreateUser,
  createPasswordResetToken,
  verifyAndResetPassword,
  createRefreshTokenForUser,
  verifyRefreshToken
};
