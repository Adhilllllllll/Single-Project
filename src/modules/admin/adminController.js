const User = require("../users/User");
const Student = require("../students/student");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const { sendUserCredentials } = require("../auth/emailService");

exports.getDashboardCounts = async (req, res) => {
  try {
    const [students, reviewers, advisors] = await Promise.all([
      Student.countDocuments(),
      User.countDocuments({ role: "reviewer" }),
      User.countDocuments({ role: "advisor" }),
    ]);

    res.json({ students, reviewers, advisors });
  } catch (err) {
    console.error("Admin counts error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Create a new user (advisor, reviewer, or student)
 * POST /api/admin/create-user
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, role, domain, advisorId } = req.body;

    // 1. Validate required fields
    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email, and role are required",
      });
    }

    // 2. Validate role
    const validRoles = ["advisor", "reviewer", "student"];
    if (!validRoles.includes(role.toLowerCase())) {
      return res.status(400).json({
        message: "Invalid role. Must be: advisor, reviewer, or student",
      });
    }

    const normalizedRole = role.toLowerCase();
    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check for duplicate email in both User and Student collections
    const existingUser = await User.findOne({ email: normalizedEmail });
    const existingStudent = await Student.findOne({ email: normalizedEmail });

    if (existingUser || existingStudent) {
      return res.status(400).json({
        message: "A user with this email already exists",
      });
    }

    // 4. For students, advisorId is required
    if (normalizedRole === "student" && !advisorId) {
      return res.status(400).json({
        message: "Advisor ID is required for student creation",
      });
    }

    // 5. Generate secure temporary password (12 characters)
    const tempPassword = crypto.randomBytes(6).toString("hex");

    // 6. Hash password
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    // 7. Set password expiration (3 days from now)
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setDate(passwordExpiresAt.getDate() + 3);

    let newUser;

    // 8. Create user in appropriate collection
    if (normalizedRole === "student") {
      // Create student
      newUser = new Student({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
        advisorId,
        status: "active",
      });
    } else {
      // Create advisor or reviewer
      newUser = new User({
        name: name.trim(),
        email: normalizedEmail,
        role: normalizedRole,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
        domain: domain || undefined,
        status: "active",
      });
    }

    await newUser.save();

    // 9. Send credentials via email
    try {
      await sendUserCredentials(normalizedEmail, name.trim(), tempPassword);
    } catch (emailErr) {
      console.error("Email sending failed:", emailErr.message);
      // User is created successfully, just log the email error
    }

    // 10. Return success response
    return res.status(201).json({
      message: `${normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1)} created successfully`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: normalizedRole,
      },
    });
  } catch (err) {
    console.error("Create user error:", err);
    return res.status(500).json({
      message: "Server error",
      error: err.message,
    });
  }
};
