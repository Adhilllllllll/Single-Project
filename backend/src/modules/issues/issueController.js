const Issue = require("./Issue");
const Student = require("../students/student");
const User = require("../users/User");

// === NOTIFICATION SERVICE ===
// Fire-and-forget notification triggers for issue events
const {
    notifyIssueCreated,
    notifyIssueStatusUpdated,
} = require("../notifications/notification.service");

/* ======================================================
   SUBMIT NEW ISSUE (Student)
   POST /api/issues
====================================================== */
exports.createIssue = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { subject, description, category, recipients } = req.body;

        if (!subject || !description) {
            return res.status(400).json({ message: "Subject and description are required" });
        }

        if (!recipients || recipients.length === 0) {
            return res.status(400).json({ message: "At least one recipient is required" });
        }

        // Get student's advisor
        const student = await Student.findById(studentId);
        if (!student || !student.advisorId) {
            return res.status(400).json({ message: "Student advisor not found" });
        }

        const issue = await Issue.create({
            studentId,
            advisorId: student.advisorId,
            subject,
            description,
            category: category || "other",
            recipients,
        });

        // Populate for response
        await issue.populate("studentId", "name email");
        await issue.populate("advisorId", "name email");

        // Send real-time notification via Socket.IO
        if (global.io) {
            // Notify advisor if in recipients
            if (recipients.includes("advisor")) {
                global.io.to(`user:${student.advisorId}`).emit("issue:new", {
                    issueId: issue._id,
                    subject,
                    category,
                    studentName: student.name,
                });
            }

            // Notify admins if in recipients
            if (recipients.includes("admin")) {
                const admins = await User.find({ role: "admin", status: "active" });
                admins.forEach((admin) => {
                    global.io.to(`user:${admin._id}`).emit("issue:new", {
                        issueId: issue._id,
                        subject,
                        category,
                        studentName: student.name,
                    });
                });
            }
        }

        // === NOTIFICATION: Create persistent notifications for recipients ===
        // Fire-and-forget: complements Socket.IO real-time delivery with DB persistence
        const recipientUserIds = [];
        if (recipients.includes("advisor")) {
            recipientUserIds.push(student.advisorId);
        }
        if (recipients.includes("admin")) {
            // Admins already fetched above for Socket.IO
            const admins = await User.find({ role: "admin", status: "active" }).select("_id").lean();
            recipientUserIds.push(...admins.map(a => a._id));
        }

        if (recipientUserIds.length > 0) {
            notifyIssueCreated({
                recipientIds: recipientUserIds,
                issueId: issue._id,
                subject,
                studentName: student.name,
                category: category || "other",
            });
        }

        res.status(201).json({
            message: "Issue submitted successfully",
            issue,
        });
    } catch (err) {
        console.error("Create Issue Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET MY ISSUES (Student)
   GET /api/issues/my
====================================================== */
exports.getMyIssues = async (req, res) => {
    try {
        const studentId = req.user.id;
        const { status } = req.query;

        const query = { studentId };
        if (status) query.status = status;

        const issues = await Issue.find(query)
            .sort({ createdAt: -1 })
            .populate("advisorId", "name")
            .lean();

        res.json({ issues });
    } catch (err) {
        console.error("Get My Issues Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET ISSUES FOR ADVISOR/ADMIN
   GET /api/issues
====================================================== */
exports.getIssues = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status } = req.query;

        let query = {};

        if (userRole === "advisor") {
            // Advisor sees issues from their students that include them as recipient
            query = { advisorId: userId, recipients: "advisor" };
        } else if (userRole === "admin") {
            // Admin sees all issues that include admin as recipient
            query = { recipients: "admin" };
        } else {
            return res.status(403).json({ message: "Access denied" });
        }

        if (status) query.status = status;

        const issues = await Issue.find(query)
            .sort({ createdAt: -1 })
            .populate("studentId", "name email")
            .lean();

        res.json({ issues });
    } catch (err) {
        console.error("Get Issues Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET SINGLE ISSUE
   GET /api/issues/:id
====================================================== */
exports.getIssueById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;

        const issue = await Issue.findById(id)
            .populate("studentId", "name email avatar")
            .populate("advisorId", "name email")
            .populate("resolvedBy", "name");

        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        // Check authorization
        const isStudent = issue.studentId._id.toString() === userId;
        const isAdvisor = issue.advisorId._id.toString() === userId && issue.recipients.includes("advisor");
        const isAdmin = userRole === "admin" && issue.recipients.includes("admin");

        if (!isStudent && !isAdvisor && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to view this issue" });
        }

        res.json({ issue });
    } catch (err) {
        console.error("Get Issue By Id Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   RESPOND TO ISSUE (Advisor/Admin)
   POST /api/issues/:id/respond
====================================================== */
exports.respondToIssue = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { message } = req.body;

        if (!message?.trim()) {
            return res.status(400).json({ message: "Response message is required" });
        }

        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        // Check authorization
        const isAdvisor = issue.advisorId.toString() === userId && issue.recipients.includes("advisor");
        const isAdmin = userRole === "admin" && issue.recipients.includes("admin");

        if (!isAdvisor && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to respond to this issue" });
        }

        // Get responder info
        const responder = await User.findById(userId).select("name role");

        // Add response
        issue.responses.push({
            responderId: userId,
            responderModel: "User",
            responderName: responder.name,
            responderRole: responder.role,
            message: message.trim(),
        });

        // Update status to in-progress if still pending
        if (issue.status === "pending") {
            issue.status = "in-progress";
        }

        await issue.save();

        // Notify student via Socket.IO
        if (global.io) {
            global.io.to(`user:${issue.studentId}`).emit("issue:response", {
                issueId: issue._id,
                subject: issue.subject,
                responderName: responder.name,
                message: message.trim(),
            });
        }

        res.json({ message: "Response added successfully", issue });
    } catch (err) {
        console.error("Respond To Issue Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   UPDATE ISSUE STATUS (Advisor/Admin)
   PATCH /api/issues/:id/status
====================================================== */
exports.updateIssueStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const userRole = req.user.role;
        const { status } = req.body;

        if (!["pending", "in-progress", "resolved"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        const issue = await Issue.findById(id);
        if (!issue) {
            return res.status(404).json({ message: "Issue not found" });
        }

        // Check authorization
        const isAdvisor = issue.advisorId.toString() === userId && issue.recipients.includes("advisor");
        const isAdmin = userRole === "admin" && issue.recipients.includes("admin");

        if (!isAdvisor && !isAdmin) {
            return res.status(403).json({ message: "Not authorized to update this issue" });
        }

        issue.status = status;
        if (status === "resolved") {
            issue.resolvedAt = new Date();
            issue.resolvedBy = userId;
        }

        await issue.save();

        // Notify student via Socket.IO
        if (global.io) {
            global.io.to(`user:${issue.studentId}`).emit("issue:statusUpdate", {
                issueId: issue._id,
                subject: issue.subject,
                status,
            });
        }

        // === NOTIFICATION: Create persistent notification for student ===
        // Fire-and-forget: complements Socket.IO with DB persistence
        // Get responder name for notification message
        const responder = await User.findById(userId).select("name").lean();
        notifyIssueStatusUpdated({
            studentId: issue.studentId,
            issueId: issue._id,
            subject: issue.subject,
            newStatus: status,
            responderName: responder?.name || "Staff",
        });

        res.json({ message: `Issue marked as ${status}`, issue });
    } catch (err) {
        console.error("Update Issue Status Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};

/* ======================================================
   GET ISSUE COUNTS (For badges)
   GET /api/issues/counts
   
   REFACTORED: Consolidated 3 countDocuments → 1 aggregation
   - REMOVED: 3 separate countDocuments calls (3 DB round trips)
   - ADDED: Single aggregation with $group + $cond (1 DB call)
   - Response structure unchanged: { pending, inProgress, resolved, total }
====================================================== */
exports.getIssueCounts = async (req, res) => {
    try {
        const userId = req.user.id;
        const userRole = req.user.role;

        let query = {};

        if (userRole === "advisor") {
            query = { advisorId: new (require("mongoose").Types.ObjectId)(userId), recipients: "advisor" };
        } else if (userRole === "admin") {
            query = { recipients: "admin" };
        } else if (userRole === "student") {
            query = { studentId: new (require("mongoose").Types.ObjectId)(userId) };
        }

        // === SINGLE AGGREGATION - REPLACES 3 countDocuments ===
        // Previously:
        //   const pending = await Issue.countDocuments({ ...query, status: "pending" });
        //   const inProgress = await Issue.countDocuments({ ...query, status: "in-progress" });
        //   const resolved = await Issue.countDocuments({ ...query, status: "resolved" });
        // Now: One aggregation with conditional counting
        const result = await Issue.aggregate([
            { $match: query },
            {
                $group: {
                    _id: null,
                    pending: {
                        $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
                    },
                    inProgress: {
                        $sum: { $cond: [{ $eq: ["$status", "in-progress"] }, 1, 0] },
                    },
                    resolved: {
                        $sum: { $cond: [{ $eq: ["$status", "resolved"] }, 1, 0] },
                    },
                    total: { $sum: 1 },
                },
            },
        ]);

        // Handle empty result (no issues match query)
        const counts = result[0] || { pending: 0, inProgress: 0, resolved: 0, total: 0 };

        res.json({
            pending: counts.pending,
            inProgress: counts.inProgress,
            resolved: counts.resolved,
            total: counts.total,
        });
    } catch (err) {
        console.error("Get Issue Counts Error:", err);
        res.status(500).json({ message: "Server error" });
    }
};
