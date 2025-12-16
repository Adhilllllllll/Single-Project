// const bcrypt = require("bcryptjs");
// const crypto = require("crypto");
// const User = require("./User");
// const Student = require("../students/student");
// const { sendUserCredentials } = require("../auth/emailService");

// exports.createUser = async (req, res) => {
//   try {
//     const { name, email, role, advisorId, batch, course } = req.body;

//     if (!name || !email || !role) {
//       return res.status(400).json({ message: "Name, email and role are required" });
//     }

//     if (!["admin", "advisor", "reviewer", "student"].includes(role)) {
//       return res.status(400).json({ message: "Invalid role" });
//     }

//     const userExists = await User.findOne({ email });
//     const studentExists = await Student.findOne({ email });

//     if (userExists || studentExists) {
//       return res.status(409).json({ message: "Email already exists" });
//     }

//     const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
//     const passwordHash = await bcrypt.hash(tempPassword, 10);
//     const passwordExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

//     if (role === "student") {
//       if (!advisorId) {
//         return res.status(400).json({ message: "advisorId is required for student" });
//       }

//       const advisor = await User.findById(advisorId);
//       if (!advisor || advisor.role !== "advisor") {
//         return res.status(400).json({ message: "Invalid advisorId" });
//       }

//       const student = await Student.create({
//         name,
//         email,
//         advisorId,
//         batch,
//         course,
//         passwordHash,
//         mustChangePassword: true,
//         passwordExpiresAt,
//         status: "active",
//       });

//       try {
//         await sendUserCredentials(email, name, tempPassword);
//       } catch (e) {}

//       return res.status(201).json({
//         message: "Student created successfully",
//         studentId: student._id,
//       });
//     }

//     const user = await User.create({
//       name,
//       email,
//       role,
//       passwordHash,
//       mustChangePassword: true,
//       passwordExpiresAt,
//       status: "active",
//     });

//     try {
//       await sendUserCredentials(email, name, tempPassword);
//     } catch (e) {}

//     return res.status(201).json({
//       message: "User created successfully",
//       userId: user._id,
//     });
//   } catch (error) {
//     console.error("Create User Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };

// exports.changePassword = async (req, res) => {
//   try {
//     const { email, oldPassword, newPassword } = req.body;

//     if (!email || !oldPassword || !newPassword) {
//       return res.status(400).json({ message: "All fields are required" });
//     }

//     let account = await User.findOne({ email });
//     let accountType = "user";

//     if (!account) {
//       account = await Student.findOne({ email });
//       accountType = "student";
//     }

//     if (!account) {
//       return res.status(404).json({ message: "Account not found" });
//     }

//     const match = await bcrypt.compare(oldPassword, account.passwordHash);
//     if (!match) {
//       return res.status(400).json({ message: "Invalid old password" });
//     }

//     account.passwordHash = await bcrypt.hash(newPassword, 10);
//     account.mustChangePassword = false;
//     account.passwordChangedAt = new Date();
//     account.passwordExpiresAt = null;

//     await account.save();

//     return res.json({
//       message: "Password changed successfully",
//       accountType,
//     });
//   } catch (error) {
//     console.error("Change Password Error:", error);
//     return res.status(500).json({ message: error.message });
//   }
// };






// const User = require("./User");
// const Student = require("../students/"); // ✅ FIXED IMPORT
// const bcrypt = require("bcrypt");
// const crypto = require("crypto");
// const { sendUserCredentials } = require("../auth/emailService");

// /* ======================================================
//    ADMIN → CREATE USER / STUDENT
// ====================================================== */
// exports.createUser = async (req, res) => {
//   try {
//     const {
//       name,
//       email,
//       role,
//       advisorId,
//       batch,
//       course,
//     } = req.body;

//     /* ---------- 1️⃣ BASIC VALIDATION ---------- */
//     if (!name || !email || !role) {
//       return res.status(400).json({
//         message: "Name, email and role are required",
//       });
//     }

//     if (!["advisor", "reviewer", "student"].includes(role)) {
//       return res.status(400).json({
//         message: "Invalid role",
//       });
//     }

//     /* ---------- 2️⃣ EMAIL UNIQUENESS CHECK ---------- */
//     const userExists = await User.findOne({ email });
//     const studentExists = await Student.findOne({ email });

//     if (userExists || studentExists) {
//       return res.status(409).json({
//         message: "Email already exists",
//       });
//     }

//     /* ---------- 3️⃣ TEMP PASSWORD ---------- */
//     const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
//     const passwordHash = await bcrypt.hash(tempPassword, 10);

//     const passwordExpiresAt = new Date(
//       Date.now() + 3 * 24 * 60 * 60 * 1000 // 3 days
//     );

//     /* ======================================================
//        4️⃣ STUDENT CREATION (SEPARATE COLLECTION)
//     ====================================================== */
//     if (role === "student") {
//       if (!advisorId) {
//         return res.status(400).json({
//           message: "advisorId is required for student",
//         });
//       }

//       // Validate advisor
//       const advisor = await User.findById(advisorId);
//       if (!advisor || advisor.role !== "advisor") {
//         return res.status(400).json({
//           message: "Invalid advisorId",
//         });
//       }

//       const student = await Student.create({
//         name,
//         email,
//         advisorId,
//         batch,
//         course,
//         passwordHash,
//         mustChangePassword: true,
//         passwordExpiresAt,
//         status: "active",
//       });

//       // Send email (non-blocking)
//       let emailSent = true;
//       try {
//         await sendUserCredentials(email, name, tempPassword);
//       } catch (err) {
//         emailSent = false;
//         console.warn("⚠️ Student email failed, account created");
//       }

//       return res.status(201).json({
//         message: emailSent
//           ? "Student created and email sent"
//           : "Student created, but email failed",
//         student: {
//           id: student._id,
//           name: student.name,
//           email: student.email,
//           advisorId: student.advisorId,
//         },
//         emailSent,
//       });
//     }

//     /* ======================================================
//        5️⃣ USER CREATION (ADVISOR / REVIEWER)
//     ====================================================== */
//     const user = await User.create({
//       name,
//       email,
//       role,
//       passwordHash,
//       mustChangePassword: true,
//       passwordExpiresAt,
//       status: "active",
//     });

//     // Send email (non-blocking)
//     let emailSent = true;
//     try {
//       await sendUserCredentials(email, name, tempPassword);
//     } catch (err) {
//       emailSent = false;
//       console.warn("⚠️ User email failed, account created");
//     }

//     return res.status(201).json({
//       message: emailSent
//         ? "User created and email sent"
//         : "User created, but email failed",
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//       },
//       emailSent,
//     });
//   } catch (err) {
//     console.error("Create User Error:", err);
//     return res.status(500).json({ message: err.message });
//   }
// };

// /* ======================================================
//    ADMIN → RESEND USER / STUDENT CREDENTIALS
// ====================================================== */
// exports.resendCredentials = async (req, res) => {
//   try {
//     const { email } = req.body;

//     if (!email) {
//       return res.status(400).json({
//         message: "Email is required",
//       });
//     }

//     let account = await User.findOne({ email });
//     let isStudent = false;

//     if (!account) {
//       account = await Student.findOne({ email });
//       isStudent = true;
//     }

//     if (!account) {
//       return res.status(404).json({
//         message: "Account not found",
//       });
//     }

//     const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
//     const passwordHash = await bcrypt.hash(tempPassword, 10);

//     account.passwordHash = passwordHash;
//     account.mustChangePassword = true;
//     account.passwordExpiresAt = new Date(
//       Date.now() + 3 * 24 * 60 * 60 * 1000
//     );

//     await account.save();

//     let emailSent = true;
//     try {
//       await sendUserCredentials(account.email, account.name, tempPassword);
//     } catch (err) {
//       emailSent = false;
//       console.warn("⚠️ Credential resend email failed");
//     }

//     return res.json({
//       message: emailSent
//         ? "Credentials resent successfully"
//         : "Credentials regenerated, but email failed",
//       emailSent,
//       accountType: isStudent ? "student" : "user",
//     });
//   } catch (err) {
//     console.error("Resend Credentials Error:", err);
//     return res.status(500).json({ message: err.message });
//   }
// };



const User = require("./User");
const Student = require("../students/student");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sendUserCredentials } = require("../auth/emailService");

/* ======================================================
   ADMIN → CREATE USER / STUDENT
====================================================== */
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

    /* ---------- 1️⃣ BASIC VALIDATION ---------- */
    if (!name || !email || !role) {
      return res.status(400).json({
        message: "Name, email and role are required",
      });
    }

    if (!["advisor", "reviewer", "student"].includes(role)) {
      return res.status(400).json({
        message: "Invalid role",
      });
    }

    /* ---------- 2️⃣ EMAIL UNIQUENESS CHECK ---------- */
    const userExists = await User.findOne({ email });
    const studentExists = await Student.findOne({ email });

    if (userExists || studentExists) {
      return res.status(409).json({
        message: "Email already exists",
      });
    }

    /* ---------- 3️⃣ TEMP PASSWORD ---------- */
    const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const passwordExpiresAt = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    );

    /* ======================================================
       4️⃣ STUDENT CREATION
    ====================================================== */
    if (role === "student") {
      if (!advisorId) {
        return res.status(400).json({
          message: "advisorId is required for student",
        });
      }

      const advisor = await User.findById(advisorId);
      if (!advisor || advisor.role !== "advisor") {
        return res.status(400).json({
          message: "Invalid advisorId",
        });
      }

      const student = await Student.create({
        name,
        email,
        advisorId,
        batch,
        course,
        passwordHash,
        mustChangePassword: true,
        passwordExpiresAt,
        status: "active",
      });

      let emailSent = true;
      try {
        await sendUserCredentials(email, name, tempPassword);
      } catch (err) {
        emailSent = false;
        console.warn("⚠️ Student email failed, account created");
      }

      return res.status(201).json({
        message: emailSent
          ? "Student created and email sent"
          : "Student created, but email failed",
        student: {
          id: student._id,
          name: student.name,
          email: student.email,
          advisorId: student.advisorId,
        },
        emailSent,
      });
    }

    /* ======================================================
       5️⃣ USER CREATION (ADVISOR / REVIEWER)
    ====================================================== */
    const user = await User.create({
      name,
      email,
      role,
      passwordHash,
      mustChangePassword: true,
      passwordExpiresAt,
      status: "active",
    });

    let emailSent = true;
    try {
      await sendUserCredentials(email, name, tempPassword);
    } catch (err) {
      emailSent = false;
      console.warn("⚠️ User email failed, account created");
    }

    return res.status(201).json({
      message: emailSent
        ? "User created and email sent"
        : "User created, but email failed",
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
    return res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   ADMIN → RESEND USER / STUDENT CREDENTIALS
====================================================== */
exports.resendCredentials = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    let account = await User.findOne({ email });
    let isStudent = false;

    if (!account) {
      account = await Student.findOne({ email });
      isStudent = true;
    }

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const tempPassword = "RMS@" + crypto.randomBytes(3).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    account.passwordHash = passwordHash;
    account.mustChangePassword = true;
    account.passwordExpiresAt = new Date(
      Date.now() + 3 * 24 * 60 * 60 * 1000
    );

    await account.save();

    let emailSent = true;
    try {
      await sendUserCredentials(account.email, account.name, tempPassword);
    } catch (err) {
      emailSent = false;
      console.warn("⚠️ Credential resend email failed");
    }

    return res.json({
      message: emailSent
        ? "Credentials resent successfully"
        : "Credentials regenerated, but email failed",
      emailSent,
      accountType: isStudent ? "student" : "user",
    });
  } catch (err) {
    console.error("Resend Credentials Error:", err);
    return res.status(500).json({ message: err.message });
  }
};

/* ======================================================
   USER / STUDENT → CHANGE OWN PASSWORD
====================================================== */
exports.changePassword = async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({
        message: "All fields are required",
      });
    }

    let account = await User.findOne({ email });
    let accountType = "user";

    if (!account) {
      account = await Student.findOne({ email });
      accountType = "student";
    }

    if (!account) {
      return res.status(404).json({
        message: "Account not found",
      });
    }

    const match = await bcrypt.compare(oldPassword, account.passwordHash);
    if (!match) {
      return res.status(400).json({
        message: "Invalid old password",
      });
    }

    account.passwordHash = await bcrypt.hash(newPassword, 10);
    account.mustChangePassword = false;
    account.passwordChangedAt = new Date();
    account.passwordExpiresAt = null;

    await account.save();

    return res.json({
      message: "Password changed successfully",
      accountType,
    });
  } catch (err) {
    console.error("Change Password Error:", err);
    return res.status(500).json({ message: err.message });
  }
};


