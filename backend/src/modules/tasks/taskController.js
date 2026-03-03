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

// Valid statuses and priorities (kept for validation in write functions)
const VALID_TASK_STATUSES = ["pending", "in-progress", "completed", "overdue"];
const VALID_PRIORITIES = ["High", "Medium", "Low"];
const VALID_CATEGORIES = ["Coding", "Documentation", "Communication", "Research", "Project", "Other"];


/* ======================================================
   GET STUDENT TASKS
   
   MONGODB-CENTRIC REFACTOR
   ────────────────────────────────────────────────────────
   BEFORE: find() + .populate() + .map() for formatting
   AFTER:  Single aggregation with $lookup + $addFields
   
   Performance:
   - Boolean flags computed in MongoDB, not JS
   - No post-processing .map() needed
====================================================== */
exports.getStudentTasks = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        // === SINGLE AGGREGATION PIPELINE ===
        // Replaces: find() + populate() + .map()
        const tasks = await Task.aggregate([
            // Stage 1: Match tasks for this student
            { $match: { student: studentId } },

            // Stage 2: Lookup advisor info (replaces .populate("createdBy"))
            {
                $lookup: {
                    from: "users",
                    localField: "createdBy",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1 } }],
                    as: "creatorInfo"
                }
            },

            // Stage 3: Unwind creator array to object
            { $unwind: { path: "$creatorInfo", preserveNullAndEmptyArrays: true } },

            // Stage 4: Add computed fields (replaces JS formatting)
            {
                $addFields: {
                    id: "$_id",
                    // hasAttachment: !!t.attachment?.path
                    hasAttachment: { $ne: [{ $ifNull: ["$attachment.path", null] }, null] },
                    // hasFeedback: !!t.feedback?.comment
                    hasFeedback: { $ne: [{ $ifNull: ["$feedback.comment", null] }, null] },
                    // assignedBy: t.createdBy?.name || "Advisor"
                    assignedBy: { $ifNull: ["$creatorInfo.name", "Advisor"] }
                }
            },

            // Stage 5: Project final shape (clean up internal fields)
            {
                $project: {
                    id: 1,
                    title: 1,
                    description: 1,
                    category: 1,
                    deadline: 1,
                    priority: 1,
                    status: 1,
                    attachmentRequired: 1,
                    hasAttachment: 1,
                    assignedBy: 1,
                    hasFeedback: 1,
                    feedback: 1,
                    _id: 0
                }
            },

            // Stage 6: Sort by deadline
            { $sort: { deadline: 1 } }
        ]);

        res.status(200).json({ tasks });
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
   
   MONGODB-CENTRIC REFACTOR
   ────────────────────────────────────────────────────────
   BEFORE: find() + .map() + nested .find() for attendee lookup
   AFTER:  Single aggregation with $filter + $arrayElemAt
   
   Performance:
   - Nested array lookup in MongoDB, not JS
   - Boolean flags computed in DB
====================================================== */
exports.getStudentWorkshops = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        // === SINGLE AGGREGATION PIPELINE ===
        // Replaces: find() + .map() + nested .find()
        const workshops = await Workshop.aggregate([
            // Stage 1: Match workshops where student is an attendee
            { $match: { "attendees.student": studentId } },

            // Stage 2: Extract this student's attendance info from array
            // Replaces: w.attendees.find(a => a.student.toString() === studentId.toString())
            {
                $addFields: {
                    attendeeInfo: {
                        $arrayElemAt: [
                            {
                                $filter: {
                                    input: "$attendees",
                                    as: "att",
                                    cond: { $eq: ["$$att.student", studentId] }
                                }
                            },
                            0
                        ]
                    }
                }
            },

            // Stage 3: Add computed fields
            {
                $addFields: {
                    id: "$_id",
                    // attendance: attendeeInfo?.attendance || "Not Attended"
                    attendance: { $ifNull: ["$attendeeInfo.attendance", "Not Attended"] },
                    // hasMaterials: w.materials && w.materials.length > 0
                    hasMaterials: { $gt: [{ $size: { $ifNull: ["$materials", []] } }, 0] }
                }
            },

            // Stage 4: Project final shape
            {
                $project: {
                    id: 1,
                    title: 1,
                    description: 1,
                    date: 1,
                    time: 1,
                    status: 1,
                    attendance: 1,
                    meetingLink: 1,
                    hasMaterials: 1,
                    _id: 0
                }
            },

            // Stage 5: Sort by date descending
            { $sort: { date: -1 } }
        ]);

        res.status(200).json({ workshops });
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
 * 
 * MONGODB-CENTRIC REFACTOR
 * ────────────────────────────────────────────────────────
 * BEFORE: find() + .populate() + .map() for formatting
 * AFTER:  Single aggregation with $lookup + $facet
 * 
 * Performance:
 * - Boolean flags computed in MongoDB
 * - Count via $facet (single query instead of two)
 */
exports.getAdvisorTasks = async (req, res) => {
    try {
        const advisorId = new mongoose.Types.ObjectId(req.user.id);
        const { status, category, studentId } = req.query;

        // Build match conditions dynamically
        const matchConditions = { createdBy: advisorId };
        if (status) matchConditions.status = status;
        if (category) matchConditions.category = category;
        if (studentId) matchConditions.student = new mongoose.Types.ObjectId(studentId);

        // === SINGLE AGGREGATION PIPELINE ===
        // Replaces: find() + populate() + .map()
        const result = await Task.aggregate([
            // Stage 1: Match tasks by advisor and optional filters
            { $match: matchConditions },

            // Stage 2: Lookup student info (replaces .populate("student"))
            {
                $lookup: {
                    from: "students",
                    localField: "student",
                    foreignField: "_id",
                    pipeline: [{ $project: { name: 1, email: 1 } }],
                    as: "studentInfo"
                }
            },

            // Stage 3: Unwind student array to object
            { $unwind: { path: "$studentInfo", preserveNullAndEmptyArrays: true } },

            // Stage 4: Add computed fields
            {
                $addFields: {
                    id: "$_id",
                    // Restructure student object
                    student: {
                        id: "$studentInfo._id",
                        name: "$studentInfo.name",
                        email: "$studentInfo.email"
                    },
                    // Boolean flags
                    hasAttachment: { $ne: [{ $ifNull: ["$attachment.path", null] }, null] },
                    hasFeedback: { $ne: [{ $ifNull: ["$feedback.comment", null] }, null] }
                }
            },

            // Stage 5: Project final shape
            {
                $project: {
                    id: 1,
                    title: 1,
                    description: 1,
                    category: 1,
                    deadline: 1,
                    priority: 1,
                    status: 1,
                    student: 1,
                    attachmentRequired: 1,
                    hasAttachment: 1,
                    attachment: 1,
                    submittedAt: 1,
                    hasFeedback: 1,
                    feedback: 1,
                    createdAt: 1,
                    _id: 0
                }
            },

            // Stage 6: Sort by deadline
            { $sort: { deadline: 1 } }
        ]);

        res.status(200).json({ tasks: result, count: result.length });
    } catch (err) {
        console.error("GET ADVISOR TASKS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch tasks" });
    }
};

/**
 * GET STUDENT TASKS BY ADVISOR - Tasks for specific student
 * GET /api/tasks/advisor/students/:studentId/tasks
 * 
 * MONGODB-CENTRIC REFACTOR
 * ────────────────────────────────────────────────────────
 * BEFORE: find() + .map() for formatting
 * AFTER:  Single aggregation with $addFields
 * 
 * Performance:
 * - Boolean flags computed in MongoDB
 * - Single pipeline for task formatting
 */
exports.getStudentTasksByAdvisor = async (req, res) => {
    try {
        const advisorId = new mongoose.Types.ObjectId(req.user.id);
        const { studentId } = req.params;
        const studentObjId = new mongoose.Types.ObjectId(studentId);

        // Verify student belongs to advisor (must remain as separate query for 404 response)
        const student = await Student.findOne({
            _id: studentObjId,
            advisorId
        }).select("name email").lean();

        if (!student) {
            return res.status(404).json({ message: "Student not found" });
        }

        // === SINGLE AGGREGATION PIPELINE ===
        // Replaces: find() + .map()
        const tasks = await Task.aggregate([
            // Stage 1: Match tasks for this student by this advisor
            { $match: { student: studentObjId, createdBy: advisorId } },

            // Stage 2: Add computed fields
            {
                $addFields: {
                    id: "$_id",
                    // hasAttachment: !!t.attachment?.path
                    hasAttachment: { $ne: [{ $ifNull: ["$attachment.path", null] }, null] },
                    // hasFeedback: !!t.feedback?.comment
                    hasFeedback: { $ne: [{ $ifNull: ["$feedback.comment", null] }, null] }
                }
            },

            // Stage 3: Project final shape
            {
                $project: {
                    id: 1,
                    title: 1,
                    description: 1,
                    category: 1,
                    deadline: 1,
                    priority: 1,
                    status: 1,
                    attachmentRequired: 1,
                    hasAttachment: 1,
                    submittedAt: 1,
                    hasFeedback: 1,
                    feedback: 1,
                    _id: 0
                }
            },

            // Stage 4: Sort by deadline
            { $sort: { deadline: 1 } }
        ]);

        res.status(200).json({
            student: { id: student._id, name: student.name, email: student.email },
            tasks,
            count: tasks.length
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
