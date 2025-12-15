const User = require("./User");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendUserCredentials } = require("../auth/emailService");

/* ======================================================
   ADMIN → CREATE USER
====================================================== */
exports.createUser = async (req, res) => {
  try {
    const { name, email, role } = req.body;

    // 1️⃣ Validate input
    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email and role are required",
      });
    }

    if (!["advisor", "reviewer", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // 2️⃣ Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "User already exists" });
    }

    // 3️⃣ Generate temporary password
    const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // 4️⃣ Password expiry (3 days)
    const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // 5️⃣ Create user (DB is source of truth)
    const user = await User.create({
      name,
      email,
      role,
      passwordHash: hashedPassword,
      status: "active",
      mustChangePassword: true,
      passwordExpiresAt: expiryDate,
    });

    // 6️⃣ Try sending email (DO NOT fail user creation)
    let emailSent = true;
    try {
      await sendUserCredentials(email, name, tempPassword);
    } catch (emailErr) {
      emailSent = false;
      console.warn("⚠️ Email failed, user created anyway");
    }

    // 7️⃣ Final response
    return res.status(201).json({
      message: emailSent
        ? "User created and email sent"
        : "User created, but email failed. Please resend credentials.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      emailSent,
    });
  } catch (err) {
    console.error("Create User Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};

/* ======================================================
   ADMIN → RESEND USER CREDENTIALS
====================================================== */
exports.resendCredentials = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate NEW temporary password
    const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Update user credentials
    user.passwordHash = hashedPassword;
    user.mustChangePassword = true;
    user.passwordExpiresAt = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    );

    await user.save();

    // Try sending email
    let emailSent = true;
    try {
      await sendUserCredentials(user.email, user.name, tempPassword);
    } catch (emailErr) {
      emailSent = false;
      console.warn("⚠️ Email resend failed");
    }

    return res.json({
      message: emailSent
        ? "Credentials resent successfully"
        : "Credentials regenerated, but email failed",
      emailSent,
    });
  } catch (err) {
    console.error("Resend Credentials Error:", err);
    return res.status(500).json({ message: "Server Error" });
  }
};
