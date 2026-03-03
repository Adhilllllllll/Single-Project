const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Student = require("../../students/Student");
const { sendUserCredentials } = require("../../auth/emailService");

exports.createUser = async (req, res) => {
  try {
    const {
      name,
      email,
      role,
      advisorId,
      batch,
      course,
    } = req.body;

    // 1️⃣ Validate role
    if (!["admin", "advisor", "reviewer", "student"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // 2️⃣ Check existing email (users + students)
    const userExists = await User.findOne({ email });
    const studentExists = await Student.findOne({ email });

    if (userExists || studentExists) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 3️⃣ Generate temp password
    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const passwordExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    // 4️⃣ STUDENT CREATION
    if (role === "student") {
      if (!advisorId) {
        return res
          .status(400)
          .json({ message: "advisorId is required for student" });
      }

      await Student.create({
        name,
        email,
        advisorId,
        batch,
        course,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
      });

      await sendUserCredentials(email, name, tempPassword);

      return res.status(201).json({
        message: "Student created successfully",
      });
    }

    // 5️⃣ USER CREATION (admin / advisor / reviewer)
    await User.create({
      name,
      email,
      role,
      passwordHash,
      mustChangePassword: true,
      passwordExpiresAt,
    });

    await sendUserCredentials(email, name, tempPassword);

    return res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Create User Error:", error);
    res.status(500).json({ message: error.message });
  }
};
