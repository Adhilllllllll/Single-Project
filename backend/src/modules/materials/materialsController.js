const mongoose = require("mongoose");
const SyllabusWeek = require("./SyllabusWeek");
const ChecklistItem = require("./ChecklistItem");

/* ======================================================
   GET SYLLABUS WEEKS (All students can access)
====================================================== */
exports.getSyllabusWeeks = async (req, res) => {
    try {
        const weeks = await SyllabusWeek.find()
            .sort({ week: 1 })
            .lean();

        res.status(200).json({ weeks });
    } catch (err) {
        console.error("GET SYLLABUS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch syllabus" });
    }
};

/* ======================================================
   GET STUDENT CHECKLIST
====================================================== */
exports.getStudentChecklist = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        let checklist = await ChecklistItem.find({ student: studentId })
            .sort({ order: 1 })
            .lean();

        // If no checklist exists, create default items
        if (checklist.length === 0) {
            const defaultItems = [
                { title: "Review project requirements", order: 1, requiresUpload: false },
                { title: "Prepare presentation slides", order: 2, requiresUpload: false },
                { title: "Upload source code", order: 3, requiresUpload: true },
                { title: "Complete documentation", order: 4, requiresUpload: true },
                { title: "Test all functionality", order: 5, requiresUpload: true },
            ];

            const created = await ChecklistItem.insertMany(
                defaultItems.map(item => ({ ...item, student: studentId }))
            );

            checklist = created.map(item => item.toObject());
        }

        // Format response
        const formatted = checklist.map(item => ({
            id: item._id,
            title: item.title,
            completed: item.completed,
            completedAt: item.completedAt,
            requiresUpload: item.requiresUpload,
            hasAttachment: !!item.attachment?.path,
        }));

        res.status(200).json({ checklist: formatted });
    } catch (err) {
        console.error("GET CHECKLIST ERROR:", err);
        res.status(500).json({ message: "Failed to fetch checklist" });
    }
};

/* ======================================================
   TOGGLE CHECKLIST ITEM
====================================================== */
exports.toggleChecklistItem = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { itemId } = req.params;

        const item = await ChecklistItem.findOne({
            _id: itemId,
            student: studentId,
        });

        if (!item) {
            return res.status(404).json({ message: "Checklist item not found" });
        }

        item.completed = !item.completed;
        item.completedAt = item.completed ? new Date() : null;
        await item.save();

        res.status(200).json({
            message: "Item updated",
            item: {
                id: item._id,
                title: item.title,
                completed: item.completed,
                completedAt: item.completedAt,
                requiresUpload: item.requiresUpload,
                hasAttachment: !!item.attachment?.path,
            },
        });
    } catch (err) {
        console.error("TOGGLE CHECKLIST ERROR:", err);
        res.status(500).json({ message: "Failed to update item" });
    }
};

/* ======================================================
   UPLOAD CHECKLIST ATTACHMENT
====================================================== */
exports.uploadChecklistAttachment = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);
        const { itemId } = req.params;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const item = await ChecklistItem.findOneAndUpdate(
            { _id: itemId, student: studentId },
            {
                attachment: {
                    filename: req.file.originalname,
                    path: `/uploads/materials/${req.file.filename}`,
                    uploadedAt: new Date(),
                },
                completed: true,
                completedAt: new Date(),
            },
            { new: true }
        );

        if (!item) {
            return res.status(404).json({ message: "Checklist item not found" });
        }

        res.status(200).json({
            message: "Attachment uploaded",
            item: {
                id: item._id,
                title: item.title,
                completed: item.completed,
                completedAt: item.completedAt,
                requiresUpload: item.requiresUpload,
                hasAttachment: true,
            },
        });
    } catch (err) {
        console.error("UPLOAD ATTACHMENT ERROR:", err);
        res.status(500).json({ message: "Failed to upload attachment" });
    }
};

/* ======================================================
   UPLOAD ADDITIONAL DOCUMENTS
====================================================== */
exports.uploadDocument = async (req, res) => {
    try {
        const studentId = req.user.id;

        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        res.status(200).json({
            message: "Document uploaded",
            document: {
                filename: req.file.originalname,
                path: `/uploads/materials/${req.file.filename}`,
                uploadedAt: new Date(),
            },
        });
    } catch (err) {
        console.error("UPLOAD DOCUMENT ERROR:", err);
        res.status(500).json({ message: "Failed to upload document" });
    }
};

/* ======================================================
   GET CHECKLIST PROGRESS
====================================================== */
exports.getChecklistProgress = async (req, res) => {
    try {
        const studentId = new mongoose.Types.ObjectId(req.user.id);

        const total = await ChecklistItem.countDocuments({ student: studentId });
        const completed = await ChecklistItem.countDocuments({
            student: studentId,
            completed: true,
        });

        res.status(200).json({
            progress: {
                completed,
                total,
                percentage: total > 0 ? Math.round((completed / total) * 100) : 0,
            },
        });
    } catch (err) {
        console.error("GET PROGRESS ERROR:", err);
        res.status(500).json({ message: "Failed to fetch progress" });
    }
};
