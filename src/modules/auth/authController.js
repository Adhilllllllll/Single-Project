const bcrypt = require("bcrypt");
const { signAccessToken } = require("../../utils/jwt");
const User = require("../users/User");
const Student = require("../students/student");







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

// /* ======================================================
//    CHANGE PASSWORD
//    - Used when mustChangePassword === true
// ====================================================== */
// exports.changePassword = async (req, res) => {
//   try {
//     const { userId, newPassword } = req.body || {};

//     //   Validate input
//     if (!userId || !newPassword) {
//       return res.status(400).json({
//         message: "UserId and new password are required",
//       });
//     }

//     if (newPassword.length < 8) {
//       return res.status(400).json({
//         message: "Password must be at least 8 characters long",
//       });
//     }

//     //   Find user
//     const user = await User.findById(userId);
//     if (!user) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     //  Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);

//     //  Update user
//     user.passwordHash = hashedPassword;
//     user.mustChangePassword = false;
//     user.passwordChangedAt = new Date();
//     user.passwordExpiresAt = null;

//     await user.save();

//     return res.json({
//       message: "Password changed successfully. Please login again.",
//     });
//   } catch (err) {
//     console.error("CHANGE PASSWORD ERROR:", err);
//     return res.status(500).json({
//       message: "Server error",
//       error: err.message,
//     });
//   }
// };
