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

/**
 * Get all users with optional role filter
 * GET /api/admin/users?role=advisor|reviewer|student
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { role, search, status } = req.query;

    let users = [];
    let students = [];

    // Build query filters
    const userQuery = { role: { $ne: "admin" } };
    const studentQuery = {};

    if (status) {
      userQuery.status = status;
      studentQuery.status = status;
    }

    // Get users based on role filter
    if (!role || role === "advisor" || role === "reviewer") {
      if (role) {
        userQuery.role = role;
      }
      users = await User.find(userQuery)
        .select("_id name email role domain status avatar createdAt")
        .sort({ createdAt: -1 })
        .lean();
    }

    if (!role || role === "student") {
      students = await Student.find(studentQuery)
        .select("_id name email batch course status avatar advisorId createdAt")
        .populate("advisorId", "name")
        .sort({ createdAt: -1 })
        .lean();

      // Format students to match user structure
      students = students.map(s => ({
        _id: s._id,
        name: s.name,
        email: s.email,
        role: "student",
        domain: s.course || s.batch,
        status: s.status,
        avatar: s.avatar,
        advisorName: s.advisorId?.name,
        createdAt: s.createdAt,
        isStudent: true,
      }));
    }

    // Combine and apply search filter
    let allUsers = [...users.map(u => ({ ...u, isStudent: false })), ...students];

    if (search) {
      const searchLower = search.toLowerCase();
      allUsers = allUsers.filter(
        u =>
          u.name.toLowerCase().includes(searchLower) ||
          u.email.toLowerCase().includes(searchLower)
      );
    }

    // Sort by creation date (newest first)
    allUsers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ users: allUsers });
  } catch (err) {
    console.error("Get all users error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Get single user by ID
 * GET /api/admin/users/:id
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;

    if (type === "student") {
      user = await Student.findById(id)
        .populate("advisorId", "name email")
        .lean();
      if (user) {
        user.role = "student";
        user.isStudent = true;
      }
    } else {
      user = await User.findById(id).lean();
      if (user) {
        user.isStudent = false;
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    console.error("Get user by ID error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Update user details
 * PATCH /api/admin/users/:id
 */
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'
    const { name, domain, phone, batch, course } = req.body;

    let user;
    const updateData = {};

    if (name) updateData.name = name.trim();
    if (phone) updateData.phone = phone.trim();

    if (type === "student") {
      if (batch) updateData.batch = batch.trim();
      if (course) updateData.course = course.trim();

      user = await Student.findByIdAndUpdate(id, updateData, { new: true }).lean();
      if (user) {
        user.role = "student";
      }
    } else {
      if (domain) updateData.domain = domain.trim();

      user = await User.findByIdAndUpdate(id, updateData, { new: true }).lean();
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      message: "User updated successfully",
      user,
    });
  } catch (err) {
    console.error("Update user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Toggle user status (active/inactive)
 * PATCH /api/admin/users/:id/status
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;

    if (type === "student") {
      user = await Student.findById(id);
    } else {
      user = await User.findById(id);
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Toggle status
    user.status = user.status === "active" ? "inactive" : "active";
    await user.save();

    res.json({
      message: `User ${user.status === "active" ? "activated" : "deactivated"} successfully`,
      status: user.status,
    });
  } catch (err) {
    console.error("Toggle user status error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * Delete user
 * DELETE /api/admin/users/:id
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'student' or 'user'

    let user;

    if (type === "student") {
      user = await Student.findByIdAndDelete(id);
    } else {
      user = await User.findById(id);

      // Prevent deleting admin users
      if (user && user.role === "admin") {
        return res.status(403).json({ message: "Cannot delete admin users" });
      }

      if (user) {
        await User.findByIdAndDelete(id);
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
