const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { signAccessToken } = require("../../utils/jwt");
const User = require("../users/User");
const Student = require("../students/student");
const { sendPasswordResetEmail } = require("./emailService");

/* ======================================================
   INTERNAL HELPER FUNCTIONS
====================================================== */

// Response helpers - consistent patterns
const sendSuccess = (res, data, message = "Success", status = 200) => {
  res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500) => {
  res.status(status).json({ message });
};

const handleError = (res, err, context) => {
  console.error(`${context} ERROR:`, err);
  sendError(res, "Server error", 500);
};

// Find account in User or Student collection
const findAccountByEmail = async (email) => {
  const emailNormalized = email.trim().toLowerCase();
  let account = await User.findOne({ email: emailNormalized });
  let accountType = "user";

  if (!account) {
    account = await Student.findOne({ email: emailNormalized });
    accountType = "student";
  }

  return { account, accountType };
};

// Constants
const BCRYPT_ROUNDS = 10;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

/* ======================================================
   LOGIN
   - Admin / Reviewer / Student
   - Handles first-time login (mustChangePassword)
====================================================== */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    // Validate input
    if (!email || !password) {
      return sendError(res, "Email and password are required", 400);
    }

    // Find account
    const { account, accountType } = await findAccountByEmail(email);

    if (!account) {
      return sendError(res, "Invalid credentials", 400);
    }

    // Check account status
    if (account.status === "inactive") {
      return sendError(res, "Account disabled", 403);
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return sendError(res, "Invalid credentials", 400);
    }

    // Generate access token
    const tokenPayload = {
      id: account._id,
      role: accountType === "student" ? "student" : account.role,
      accountType,
    };

    const accessToken = signAccessToken(tokenPayload);

    // Success response
    return sendSuccess(res, {
      accessToken,
      mustChangePassword: account.mustChangePassword || false,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: tokenPayload.role,
      },
    });

  } catch (err) {
    handleError(res, err, "LOGIN");
  }
};
/* ======================================================
   FORGOT PASSWORD
   - Sends password reset email with token
====================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) return sendError(res, "Email is required", 400);

    const { account } = await findAccountByEmail(email);

    // Always return success (don't reveal if email exists)
    const successMsg = "If an account with that email exists, a reset link has been sent.";
    if (!account) return sendSuccess(res, {}, successMsg);

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token to account
    account.resetPasswordToken = resetTokenHash;
    account.resetPasswordExpires = new Date(Date.now() + RESET_TOKEN_EXPIRY_MS);
    await account.save();

    // Send reset email (no await - fire and forget)
    sendPasswordResetEmail(account.email, account.name, resetToken).catch(err =>
      console.error("Email send failed:", err.message)
    );

    return sendSuccess(res, {}, successMsg);
  } catch (err) {
    handleError(res, err, "FORGOT PASSWORD");
  }
};

/* ======================================================
   RESET PASSWORD
   - Validates token and sets new password
====================================================== */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body || {};

    if (!token || !newPassword) {
      return sendError(res, "Token and new password are required", 400);
    }

    if (newPassword.length < 8) {
      return sendError(res, "Password must be at least 8 characters", 400);
    }

    // Hash the token to match stored hash
    const resetTokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Find account with valid token
    let account = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!account) {
      account = await Student.findOne({
        resetPasswordToken: resetTokenHash,
        resetPasswordExpires: { $gt: new Date() },
      });
    }

    if (!account) return sendError(res, "Invalid or expired reset token", 400);

    // Update password
    account.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    account.mustChangePassword = false;
    account.passwordChangedAt = new Date();
    await account.save();

    return sendSuccess(res, {}, "Password reset successful. Please login with your new password.");
  } catch (err) {
    handleError(res, err, "RESET PASSWORD");
  }
};
