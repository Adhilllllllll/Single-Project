const mongoose = require("mongoose");
const Task = require("./Task");
const Workshop = require("./Workshop");

/* ======================================================
   INTERNAL HELPER FUNCTIONS
====================================================== */

// Response helpers
const sendSuccess = (res, data, message = "Success", status = 200) => {
    res.status(status).json({ message, ...data });
};

const sendError = (res, message, status = 500) => {
    res.status(status).json({ message });
};

const handleError = (res, err, context, fallbackMsg = "Server error") => {
    console.error(`${context} ERROR:`, err);
    sendError(res, fallbackMsg, 500);
};

// ObjectId helper
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Task formatter helper
const formatTask = (t) => ({
    id: t._id,
    title: t.title,
    description: t.description,
    category: t.category,
    deadline: t.deadline,
    priority: t.priority,
    status: t.status,
    attachmentRequired: t.attachmentRequired,
    hasAttachment: !!t.attachment?.path,
    assignedBy: t.createdBy?.name || "Advisor",
    hasFeedback: !!t.feedback?.comment,
    feedback: t.feedback,
});

// Valid statuses and priorities
const VALID_TASK_STATUSES = ["pending", "in-progress", "completed", "overdue"];
const VALID_PRIORITIES = ["High", "Medium", "Low"];
const VALID_CATEGORIES = ["Coding", "Documentation", "Communication", "Research", "Project", "Other"];


/* ======================================================
   GET STUDENT TASKS
====================================================== */
exports.getStudentTasks = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        const tasks = await Task.find({ student: studentId })
            .populate("createdBy", "name")
            .sort({ deadline: 1 })
            .lean();

        const formatted = tasks.map(t => ({
            id: t._id,
            title: t.title,
            description: t.description,
            category: t.category,
            deadline: t.deadline,
            priority: t.priority,
            status: t.status,
            attachmentRequired: t.attachmentRequired,
            hasAttachment: !!t.attachment?.path,
            assignedBy: t.createdBy?.name || "Advisor",
            hasFeedback: !!t.feedback?.comment,
            feedback: t.feedback,
        }));

        res.status(200).json({ tasks: formatted });
    } catch (err) {
        console.error("GET STUDENT TASKS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};

/* ======================================================
   UPDATE TASK STATUS
====================================================== */
exports.updateTaskStatus = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { taskId } = req.params;
        const { status } = req.body;

        const task = await Task.findOneAndUpdate(
            { _id: taskId, student: studentId },
            { status },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task updated", task });
    } catch (err) {
        console.error("UPDATE TASK ERROR:", err);
        res.status(500).json({ message: "Failed to update task" });
    }
};

/* ======================================================
   UPLOAD TASK ATTACHMENT
====================================================== */
exports.uploadTaskAttachment = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { taskId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const task = await Task.findOneAndUpdate(
            { _id: taskId, student: studentId },
            {
                attachment: {
                    filename: req.file.originalname,
                    path: `/uploads/tasks/${req.file.filename}`,
                    uploadedAt: new Date(),
                },
                status: "Completed",
            },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Attachment uploaded", task });
    } catch (err) {
        console.error("UPLOAD ATTACHMENT ERROR:", err);
        res.status(500).json({ message: "Failed to upload attachment" });
    }
};

/* ======================================================
   GET STUDENT WORKSHOPS
====================================================== */
exports.getStudentWorkshops = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        // Get all workshops where student is an attendee
        const workshops = await Workshop.find({
            "attendees.student": studentId,
        })
            .sort({ date: -1 })
            .lean();

        const formatted = workshops.map(w => {
            const attendeeInfo = w.attendees.find(
                a => a.student.toString() === studentId.toString()
            );
            return {
                id: w._id,
                title: w.title,
                description: w.description,
                date: w.date,
                time: w.time,
                status: w.status,
                attendance: attendeeInfo?.attendance || "Not Attended",
                meetingLink: w.meetingLink,
                hasMaterials: w.materials && w.materials.length > 0,
            };
        });

        res.status(200).json({ workshops: formatted });
    } catch (err) {
        console.error("GET STUDENT WORKSHOPS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch workshops" });
    }
};

/* ======================================================
   MARK WORKSHOP ATTENDANCE
====================================================== */
exports.markAttendance = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { workshopId } = req.params;

        const workshop = await Workshop.findOneAndUpdate(
            {
                _id: workshopId,
                "attendees.student": studentId,
            },
            {
                $set: {
                    "attendees.$.attendance": "Attended",
                    "attendees.$.joinedAt": new Date(),
                },
            },
            { new: true }
        );

        if (!workshop) {
            return res.status(404).json({ message: "Workshop not found" });
        }

        res.status(200).json({ message: "Attendance marked", workshop });
    } catch (err) {
        console.error("MARK ATTENDANCE ERROR:", err);
        res.status(500).json({ message: "Failed to mark attendance" });
    }
};

/* ======================================================
   GET WORKSHOP MATERIALS
====================================================== */
exports.getWorkshopMaterials = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { workshopId } = req.params;

        const workshop = await Workshop.findOne({
            _id: workshopId,
            "attendees.student": studentId,
        }).lean();

        if (!workshop) {
            return res.status(404).json({ message: "Workshop not found" });
        }

        res.status(200).json({
            workshop: {
                id: workshop._id,
                title: workshop.title,
                materials: workshop.materials || [],
            },
        });
    } catch (err) {
        console.error("GET MATERIALS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch materials" });
    }
};

/* ======================================================
   ADVISOR TASK MANAGEMENT
====================================================== */

const Student = require("../students/student");
const User = require("../users/User");
const Notification = require("../notifications/Notification");

/**
 * CREATE TASK - Advisor assigns task to student(s)
 * POST /api/tasks/advisor/tasks
 */
exports.createTask = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { studentIds, title, description, category, deadline, priority, attachmentRequired, reviewLink } = req.body;

        // Validation
        if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
            return res.status(400).json({ message: "At least one student is required" });
        }
        if (!title || !title.trim()) {
            return res.status(400).json({ message: "Title is required" });
        }
        if (!deadline) {
            return res.status(400).json({ message: "Deadline is required" });
        }

        // Verify students belong to this advisor
        const students = await Student.find({
            _id: { $in: studentIds },
            advisorId,
            status: "active"
        }).select("_id name");

        if (students.length === 0) {
            return res.status(400).json({ message: "No valid students found" });
        }

        // Get advisor name for notifications
        const advisor = await User.findById(advisorId).select("name");

        // Create tasks for each student
        const tasks = await Task.insertMany(
            students.map(student => ({
                student: student._id,
                title: title.trim(),
                description: description?.trim() || "",
                category: category || "Other",
                deadline: new Date(deadline),
                priority: priority || "Medium",
                attachmentRequired: attachmentRequired || false,
                createdBy: advisorId,
                reviewLink: reviewLink || null,
            }))
        );

        // Create notifications for each student
        const notifications = students.map(student => ({
            recipient: student._id,
            recipientModel: "Student",
            type: "task_assigned",
            title: "New Task Assigned",
            message: `${advisor?.name || "Your advisor"} assigned you: ${title}`,
            metadata: {
                taskId: tasks.find(t => t.student.toString() === student._id.toString())?._id
            }
        }));
        await Notification.insertMany(notifications);

        res.status(201).json({
            message: `Task assigned to ${students.length} student(s)`,
            tasks: tasks.map(t => ({
                id: t._id,
                student: students.find(s => s._id.toString() === t.student.toString())?.name,
                title: t.title,
                deadline: t.deadline,
            }))
        });
    } catch (err) {
        console.error("CREATE TASK ERROR:", err);
        res.status(500).json({ message: "Failed to create task" });
    }
};

/**
 * GET ADVISOR TASKS - All tasks created by this advisor
 * GET /api/tasks/advisor/tasks
 */
exports.getAdvisorTasks = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { status, category, studentId } = req.query;

        const query = { createdBy: advisorId };
        if (status) query.status = status;
        if (category) query.category = category;
        if (studentId) query.student = studentId;

        const tasks = await Task.find(query)
            .populate("student", "name email")
            .sort({ deadline: 1 })
            .lean();

        const formatted = tasks.map(t => ({
            id: t._id,
            title: t.title,
            description: t.description,
            category: t.category,
            deadline: t.deadline,
            priority: t.priority,
            status: t.status,
            student: {
                id: t.student?._id,
                name: t.student?.name,
                email: t.student?.email,
            },
            attachmentRequired: t.attachmentRequired,
            hasAttachment: !!t.attachment?.path,
            attachment: t.attachment,
            submittedAt: t.submittedAt,
            hasFeedback: !!t.feedback?.comment,
            feedback: t.feedback,
            createdAt: t.createdAt,
        }));

        res.status(200).json({ tasks: formatted, count: formatted.length });
    } catch (err) {
        console.error("GET ADVISOR TASKS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};

/**
 * GET STUDENT TASKS BY ADVISOR - Tasks for specific student
 * GET /api/tasks/advisor/students/:studentId/tasks
 */
exports.getStudentTasksByAdvisor = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { studentId } = req.params;

        // Verify student belongs to advisor
        const student = await Student.findOne({
            _id: studentId,
            advisorId
        }).select("name email");

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        const tasks = await Task.find({
            student: studentId,
            createdBy: advisorId
        }).sort({ deadline: 1 }).lean();

        const formatted = tasks.map(t => ({
            id: t._id,
            title: t.title,
            description: t.description,
            category: t.category,
            deadline: t.deadline,
            priority: t.priority,
            status: t.status,
            attachmentRequired: t.attachmentRequired,
            hasAttachment: !!t.attachment?.path,
            submittedAt: t.submittedAt,
            hasFeedback: !!t.feedback?.comment,
            feedback: t.feedback,
        }));

        res.status(200).json({
            student: { id: student._id, name: student.name, email: student.email },
            tasks: formatted,
            count: formatted.length
        });
    } catch (err) {
        console.error("GET STUDENT TASKS BY ADVISOR ERROR:", err);
        res.status(500).json({ message: "Failed to fetch student tasks" });
    }
};

/**
 * UPDATE TASK - Edit task details
 * PUT /api/tasks/advisor/tasks/:taskId
 */
exports.updateTask = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { taskId } = req.params;
        const { title, description, category, deadline, priority, attachmentRequired } = req.body;

        const updateData = {};
        if (title) updateData.title = title.trim();
        if (description !== undefined) updateData.description = description.trim();
        if (category) updateData.category = category;
        if (deadline) updateData.deadline = new Date(deadline);
        if (priority) updateData.priority = priority;
        if (attachmentRequired !== undefined) updateData.attachmentRequired = attachmentRequired;

        const task = await Task.findOneAndUpdate(
            { _id: taskId, createdBy: advisorId },
            { $set: updateData },
            { new: true }
        ).populate("student", "name");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task updated", task });
    } catch (err) {
        console.error("UPDATE TASK ERROR:", err);
        res.status(500).json({ message: "Failed to update task" });
    }
};

/**
 * DELETE TASK - Remove task
 * DELETE /api/tasks/advisor/tasks/:taskId
 */
exports.deleteTask = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { taskId } = req.params;

        const task = await Task.findOneAndDelete({
            _id: taskId,
            createdBy: advisorId
        });

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        res.status(200).json({ message: "Task deleted" });
    } catch (err) {
        console.error("DELETE TASK ERROR:", err);
        res.status(500).json({ message: "Failed to delete task" });
    }
};

/**
 * ADD TASK FEEDBACK - Review student submission
 * PATCH /api/tasks/advisor/tasks/:taskId/feedback
 */
exports.addTaskFeedback = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { taskId } = req.params;
        const { comment, rating } = req.body;

        if (!comment || !comment.trim()) {
            return res.status(400).json({ message: "Feedback comment is required" });
        }

        const task = await Task.findOneAndUpdate(
            { _id: taskId, createdBy: advisorId },
            {
                $set: {
                    feedback: {
                        comment: comment.trim(),
                        rating: rating || null,
                        givenAt: new Date(),
                        givenBy: advisorId
                    }
                }
            },
            { new: true }
        ).populate("student", "name");

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        // Get advisor name for notification
        const advisor = await User.findById(advisorId).select("name");

        // Notify student about feedback
        await Notification.create({
            recipient: task.student._id,
            recipientModel: "Student",
            type: "task_deadline", // Reusing type
            title: "Task Feedback Received",
            message: `${advisor?.name || "Your advisor"} provided feedback on: ${task.title}`,
            metadata: { taskId: task._id }
        });

        res.status(200).json({ message: "Feedback added", task });
    } catch (err) {
        console.error("ADD FEEDBACK ERROR:", err);
        res.status(500).json({ message: "Failed to add feedback" });
    }
};

/**
 * GET TASK ATTACHMENT - Download student submission
 * GET /api/tasks/advisor/tasks/:taskId/attachment
 */
exports.getTaskAttachment = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { taskId } = req.params;

        const task = await Task.findOne({
            _id: taskId,
            createdBy: advisorId
        }).lean();

        if (!task) {
            return res.status(404).json({ message: "Task not found" });
        }

        if (!task.attachment?.path) {
            return res.status(404).json({ message: "No attachment found" });
        }

        res.status(200).json({
            attachment: {
                filename: task.attachment.filename,
                path: task.attachment.path,
                uploadedAt: task.attachment.uploadedAt
            }
        });
    } catch (err) {
        console.error("GET ATTACHMENT ERROR:", err);
        res.status(500).json({ message: "Failed to fetch attachment" });
    }
};
