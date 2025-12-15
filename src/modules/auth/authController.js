const bcrypt = require("bcrypt");
const { signAccessToken } = require("../../utils/jwt");
const User = require("../users/User");

/* ======================================================
   LOGIN
   - Admin / Reviewer / Student
   - Handles first-time login (mustChangePassword)
====================================================== */
exports.login = async (req, res) => {
  try {
    console.log("LOGIN BODY >>>", req.body);

    const { email, password } = req.body || {};

    //   Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    //   Normalize email (CRITICAL FIX)
    const emailNormalized = email.trim().toLowerCase();

    //  Find user
    const user = await User.findOne({ email: emailNormalized });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    //   Check account status
    if (user.status === "inactive") {
      return res.status(403).json({ message: "Account disabled" });
    }

    //   Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    //   First-time login → force password change
    if (user.mustChangePassword) {
      return res.status(200).json({
        message: "Password change required",
        mustChangePassword: true,
        userId: user._id,
        role: user.role,
      });
    }

    //   Generate access token
    const accessToken = signAccessToken({
      id: user._id,
      role: user.role,
    });

    //   Success response
    return res.json({
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};

/* ======================================================
   CHANGE PASSWORD
   - Used when mustChangePassword === true
====================================================== */
exports.changePassword = async (req, res) => {
  try {
    const { userId, newPassword } = req.body || {};

    //   Validate input
    if (!userId || !newPassword) {
      return res.status(400).json({
        message: "UserId and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    //   Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    //  Update user
    user.passwordHash = hashedPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    user.passwordExpiresAt = null;

    await user.save();

    return res.json({
      message: "Password changed successfully. Please login again.",
    });
  } catch (err) {
    console.error("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
