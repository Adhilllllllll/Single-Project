const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Student = require("./student");
const ReviewSession = require("../reviews/reviewSession");
const Task = require("../tasks/Task");
const User = require("../users/User");

/* ======================================================
   GET STUDENT DASHBOARD (GET /api/students/dashboard)
====================================================== */
exports.getDashboard = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        // Get student info
        const student = await Student.findById(studentId)
            .populate("advisorId", "name")
            .lean();

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Stats calculations
        const [
            upcomingReviewsCount,
            pendingTasksCount,
            totalReviews,
            completedReviews,
        ] = await Promise.all([
            // Count upcoming reviews (scheduled, not completed)
            ReviewSession.countDocuments({
                studentId: studentId,
                status: { $in: ["pending", "accepted", "scheduled"] },
                date: { $gte: new Date() },
            }),
            // Count pending tasks
            Task.countDocuments({
                studentId: studentId,
                status: { $in: ["pending", "in-progress"] },
            }),
            // Total reviews for this student
            ReviewSession.countDocuments({ studentId: studentId }),
            // Completed reviews with scores
            ReviewSession.find({
                studentId: studentId,
                status: "completed",
            }).select("score feedback reviewerId date").populate("reviewerId", "name").lean(),
        ]);

        // Calculate average score and overall progress
        let avgScore = 0;
        if (completedReviews.length > 0) {
            const totalScore = completedReviews.reduce((sum, r) => sum + (r.score || 0), 0);
            avgScore = Math.round(totalScore / completedReviews.length);
        }
        const overallProgress = totalReviews > 0
            ? Math.round((completedReviews.length / totalReviews) * 100)
            : 0;

        // Get upcoming reviews list (next 5)
        const upcomingReviews = await ReviewSession.find({
            studentId: studentId,
            status: { $in: ["pending", "accepted", "scheduled"] },
            date: { $gte: new Date() },
        })
            .sort({ date: 1 })
            .limit(5)
            .populate("reviewerId", "name")
            .lean();

        // Format upcoming reviews
        const formattedUpcoming = upcomingReviews.map(r => ({
            id: r._id,
            reviewerName: r.reviewerId?.name || "TBD",
            advisorName: student.advisorId?.name || "N/A",
            date: r.date,
            time: r.time || "TBD",
            status: r.status === "accepted" ? "Scheduled" : r.status,
        }));

        // Get recent feedback (last 5 completed reviews with feedback)
        const recentFeedback = completedReviews
            .filter(r => r.feedback || r.score)
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 5)
            .map(r => ({
                id: r._id,
                reviewerName: r.reviewerId?.name || "Unknown",
                date: r.date,
                score: r.score || 0,
                feedback: r.feedback || "No feedback provided",
            }));

        res.status(200).json({
            stats: {
                upcomingReviews: upcomingReviewsCount,
                pendingTasks: pendingTasksCount,
                overallProgress,
                avgScore,
            },
            upcomingReviews: formattedUpcoming,
            recentFeedback,
        });
    } catch (err) {
        console.error("GET DASHBOARD ERROR:", err);
        res.status(500).json({ message: "Failed to fetch dashboard" });
    }
};

/* ======================================================
   GET STUDENT PROFILE (GET /api/students/me)
====================================================== */
exports.getProfile = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        const student = await Student.findById(studentId)
            .select("-passwordHash -mustChangePassword -passwordExpiresAt")
            .lean();

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({
            profile: {
                id: student._id,
                name: student.name,
                email: student.email,
                phone: student.phone,
                batch: student.batch,
                course: student.course,
                domain: student.domain,
                avatar: student.avatar,
                createdAt: student.createdAt,
            },
        });
    } catch (err) {
        console.error("GET PROFILE ERROR:", err);
        res.status(500).json({ message: "Failed to fetch profile" });
    }
};

/* ======================================================
   CHANGE PASSWORD (PATCH /api/students/change-password)
====================================================== */
exports.changePassword = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { currentPassword, newPassword, confirmPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({ message: "All fields are required" });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "Password must be at least 8 characters" });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New passwords do not match" });
        }

        const student = await Student.findById(studentId);
        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // Verify current password
        const isMatch = await bcrypt.compare(currentPassword, student.passwordHash);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect" });
        }

        // Hash new password
        const newHash = await bcrypt.hash(newPassword, 10);
        student.passwordHash = newHash;
        student.passwordChangedAt = new Date();
        student.mustChangePassword = false;
        await student.save();

        res.status(200).json({ message: "Password updated successfully" });
    } catch (err) {
        console.error("CHANGE PASSWORD ERROR:", err);
        res.status(500).json({ message: "Failed to change password" });
    }
};

/* ======================================================
   UPLOAD PROFILE IMAGE (POST /api/students/avatar)
====================================================== */
exports.uploadAvatar = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;

        await Student.findByIdAndUpdate(studentId, { avatar: avatarUrl });

        res.status(200).json({
            message: "Profile picture updated",
            avatar: avatarUrl,
        });
    } catch (err) {
        console.error("UPLOAD AVATAR ERROR:", err);
        res.status(500).json({ message: "Failed to upload avatar" });
    }
};

/* ======================================================
   GET PROGRESS SUMMARY (GET /api/students/progress-summary)
====================================================== */
exports.getProgressSummary = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        // Get total reviews
        const totalReviews = await ReviewSession.countDocuments({
            student: studentId,
            status: "Completed",
        });

        // Get all completed reviews for score calculation
        const completedReviews = await ReviewSession.find({
            student: studentId,
            status: "Completed",
        })
            .select("score")
            .lean();

        // Calculate average score
        let avgScore = 0;
        if (completedReviews.length > 0) {
            const totalScore = completedReviews.reduce((sum, r) => sum + (r.score || 0), 0);
            avgScore = Math.round(totalScore / completedReviews.length);
        }

        // Calculate overall progress (based on completed vs scheduled)
        const totalScheduled = await ReviewSession.countDocuments({
            student: studentId,
        });
        const overallProgress = totalScheduled > 0
            ? Math.round((totalReviews / totalScheduled) * 100)
            : 0;

        res.status(200).json({
            summary: {
                totalReviews,
                overallProgress,
                avgScore,
            },
        });
    } catch (err) {
        console.error("GET PROGRESS SUMMARY ERROR:", err);
        res.status(500).json({ message: "Failed to fetch progress summary" });
    }
};

/* ======================================================
   UPLOAD DOCUMENT (POST /api/students/documents)
====================================================== */
exports.uploadDocument = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const document = {
            filename: req.file.originalname,
            path: `/uploads/documents/${req.file.filename}`,
            type: req.file.mimetype,
            size: req.file.size,
            uploadedAt: new Date(),
        };

        await Student.findByIdAndUpdate(
            studentId,
            { $push: { documents: document } }
        );

        res.status(200).json({
            message: "Document uploaded",
            document,
        });
    } catch (err) {
        console.error("UPLOAD DOCUMENT ERROR:", err);
        res.status(500).json({ message: "Failed to upload document" });
    }
};

/* ======================================================
   GET DOCUMENTS (GET /api/students/documents)
====================================================== */
exports.getDocuments = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        const student = await Student.findById(studentId)
            .select("documents")
            .lean();

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        res.status(200).json({
            documents: student.documents || [],
        });
    } catch (err) {
        console.error("GET DOCUMENTS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch documents" });
    }
};

/* ======================================================
   DELETE DOCUMENT (DELETE /api/students/documents/:documentId)
====================================================== */
exports.deleteDocument = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { documentId } = req.params;

        await Student.findByIdAndUpdate(
            studentId,
            { $pull: { documents: { _id: documentId } } }
        );

        res.status(200).json({ message: "Document deleted" });
    } catch (err) {
        console.error("DELETE DOCUMENT ERROR:", err);
        res.status(500).json({ message: "Failed to delete document" });
    }
};
