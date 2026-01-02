const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { signAccessToken } = require("../../utils/jwt");
const User = require("../users/User");
const Student = require("../students/student");
const { sendPasswordResetEmail } = require("./emailService");







/* ======================================================
   LOGIN
   - Admin / Reviewer / Student
   - Handles first-time login (mustChangePassword)
====================================================== */
exports.login = async (req, res) => {
  console.log(" AUTH LOGIN HIT");
  console.log("METHOD:", req.method);
  console.log(" URL:", req.originalUrl);
  console.log(" HEADERS:", req.headers);
  console.log(" BODY:", req.body);
  try {
    const { email, password } = req.body || {};

    // 1️⃣ Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // 2️⃣ Find account (User first, then Student)
    let account = await User.findOne({ email: emailNormalized });
    let accountType = "user";

    if (!account) {
      account = await Student.findOne({ email: emailNormalized });
      accountType = "student";
    }

    if (!account) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 3️⃣ Check account status (if exists)
    if (account.status && account.status === "inactive") {
      return res.status(403).json({
        message: "Account disabled",
      });
    }

    // 4️⃣ Verify password
    const isMatch = await bcrypt.compare(password, account.passwordHash);
    if (!isMatch) {
      return res.status(400).json({
        message: "Invalid credentials",
      });
    }

    // 5️⃣ Check if password change is required
    const mustChangePassword = account.mustChangePassword || false;

    // 6️⃣ Generate access token
    const tokenPayload = {
      id: account._id,
      role: accountType === "student" ? "student" : account.role,
      accountType,
    };

    const accessToken = signAccessToken(tokenPayload);

    // 7️⃣ Success response (include mustChangePassword flag)
    return res.status(200).json({
      accessToken,
      mustChangePassword,
      user: {
        id: account._id,
        name: account.name,
        email: account.email,
        role: tokenPayload.role,
      },
    });

  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};

/* ======================================================
   FORGOT PASSWORD
   - Sends password reset email with token
====================================================== */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const emailNormalized = email.trim().toLowerCase();

    // Find account in User or Student collection
    let account = await User.findOne({ email: emailNormalized });

    if (!account) {
      account = await Student.findOne({ email: emailNormalized });
    }

    // Always return success (don't reveal if email exists)
    if (!account) {
      return res.status(200).json({
        message: "If an account with that email exists, a reset link has been sent.",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Save token to account (expires in 1 hour)
    account.resetPasswordToken = resetTokenHash;
    account.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000);
    await account.save();

    // Send reset email
    try {
      await sendPasswordResetEmail(account.email, account.name, resetToken);
    } catch (emailErr) {
      console.error("Email send failed:", emailErr);
    }

    return res.status(200).json({
      message: "If an account with that email exists, a reset link has been sent.",
    });

  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
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
      return res.status(400).json({
        message: "Token and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters",
      });
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

    if (!account) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    account.passwordHash = await bcrypt.hash(newPassword, 10);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    account.mustChangePassword = false;
    account.passwordChangedAt = new Date();
    await account.save();

    return res.status(200).json({
      message: "Password reset successful. Please login with your new password.",
    });

  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
    });
  }
};
