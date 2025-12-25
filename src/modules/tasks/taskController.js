const mongoose = require("mongoose");
const Task = require("./Task");
const Workshop = require("./Workshop");

/* ======================================================
   GET STUDENT TASKS
====================================================== */
exports.getStudentTasks = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        const tasks = await Task.find({ student: studentId })
            .sort({ deadline: 1 })
            .lean();

        const formatted = tasks.map(t => ({
            id: t._id,
            title: t.title,
            description: t.description,
            deadline: t.deadline,
            priority: t.priority,
            status: t.status,
            attachmentRequired: t.attachmentRequired,
            hasAttachment: !!t.attachment?.path,
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
