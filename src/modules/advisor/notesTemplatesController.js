const Note = require("./Note");
const ScoringTemplate = require("./ScoringTemplate");
const Student = require("../students/student");
const path = require("path");
const fs = require("fs");

/* ======================================================
   NOTES CRUD
====================================================== */

/**
 * GET /api/advisor/notes
 * Get all notes for the logged-in advisor
 */
exports.getNotes = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const notes = await Note.find({ advisorId })
            .populate("studentId", "name email")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ notes });
    } catch (err) {
        console.error("GET NOTES ERROR:", err);
        res.status(500).json({ message: "Failed to fetch notes" });
    }
};

/**
 * POST /api/advisor/notes
 * Create a new note
 */
exports.createNote = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { studentId, title, content } = req.body;

        if (!studentId || !title || !content) {
            return res.status(400).json({ message: "Student, title, and content are required" });
        }

        // Verify student exists and is assigned to this advisor
        const student = await Student.findOne({ _id: studentId, advisorId });
        if (!student) {
            return res.status(404).json({ message: "Student not found or not assigned to you" });
        }

        let attachmentPath = null;
        let attachmentName = null;

        if (req.file) {
            attachmentPath = `/uploads/notes/${req.file.filename}`;
            attachmentName = req.file.originalname;
        }

        const note = await Note.create({
            advisorId,
            studentId,
            title,
            content,
            attachmentPath,
            attachmentName,
        });

        const populatedNote = await Note.findById(note._id)
            .populate("studentId", "name email")
            .lean();

        res.status(201).json({ message: "Note created", note: populatedNote });
    } catch (err) {
        console.error("CREATE NOTE ERROR:", err);
        res.status(500).json({ message: "Failed to create note" });
    }
};

/**
 * PUT /api/advisor/notes/:id
 * Update a note
 */
exports.updateNote = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { id } = req.params;
        const { studentId, title, content } = req.body;

        const note = await Note.findOne({ _id: id, advisorId });
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        if (studentId) note.studentId = studentId;
        if (title) note.title = title;
        if (content) note.content = content;

        // Handle new file upload
        if (req.file) {
            // Delete old file if exists
            if (note.attachmentPath) {
                const oldPath = path.join(__dirname, "../../../public", note.attachmentPath);
                if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
            }
            note.attachmentPath = `/uploads/notes/${req.file.filename}`;
            note.attachmentName = req.file.originalname;
        }

        await note.save();

        const populatedNote = await Note.findById(note._id)
            .populate("studentId", "name email")
            .lean();

        res.json({ message: "Note updated", note: populatedNote });
    } catch (err) {
        console.error("UPDATE NOTE ERROR:", err);
        res.status(500).json({ message: "Failed to update note" });
    }
};

/**
 * DELETE /api/advisor/notes/:id
 * Delete a note
 */
exports.deleteNote = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { id } = req.params;

        const note = await Note.findOne({ _id: id, advisorId });
        if (!note) {
            return res.status(404).json({ message: "Note not found" });
        }

        // Delete attachment if exists
        if (note.attachmentPath) {
            const filePath = path.join(__dirname, "../../../public", note.attachmentPath);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        }

        await Note.deleteOne({ _id: id });

        res.json({ message: "Note deleted" });
    } catch (err) {
        console.error("DELETE NOTE ERROR:", err);
        res.status(500).json({ message: "Failed to delete note" });
    }
};

/* ======================================================
   SCORING TEMPLATES CRUD
====================================================== */

/**
 * GET /api/advisor/templates
 * Get all templates for the logged-in advisor
 */
exports.getTemplates = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const templates = await ScoringTemplate.find({ advisorId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ templates });
    } catch (err) {
        console.error("GET TEMPLATES ERROR:", err);
        res.status(500).json({ message: "Failed to fetch templates" });
    }
};

/**
 * POST /api/advisor/templates
 * Create a new scoring template
 */
exports.createTemplate = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { name, description, criteria } = req.body;

        if (!name) {
            return res.status(400).json({ message: "Template name is required" });
        }

        const template = await ScoringTemplate.create({
            advisorId,
            name,
            description: description || "",
            criteria: criteria || [],
        });

        res.status(201).json({ message: "Template created", template });
    } catch (err) {
        console.error("CREATE TEMPLATE ERROR:", err);
        res.status(500).json({ message: "Failed to create template" });
    }
};

/**
 * PUT /api/advisor/templates/:id
 * Update a template
 */
exports.updateTemplate = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { id } = req.params;
        const { name, description, criteria } = req.body;

        const template = await ScoringTemplate.findOne({ _id: id, advisorId });
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        if (name) template.name = name;
        if (description !== undefined) template.description = description;
        if (criteria !== undefined) template.criteria = criteria;

        await template.save();

        res.json({ message: "Template updated", template });
    } catch (err) {
        console.error("UPDATE TEMPLATE ERROR:", err);
        res.status(500).json({ message: "Failed to update template" });
    }
};

/**
 * DELETE /api/advisor/templates/:id
 * Delete a template
 */
exports.deleteTemplate = async (req, res) => {
    try {
        const advisorId = req.user.id;
        const { id } = req.params;

        const template = await ScoringTemplate.findOne({ _id: id, advisorId });
        if (!template) {
            return res.status(404).json({ message: "Template not found" });
        }

        await ScoringTemplate.deleteOne({ _id: id });

        res.json({ message: "Template deleted" });
    } catch (err) {
        console.error("DELETE TEMPLATE ERROR:", err);
        res.status(500).json({ message: "Failed to delete template" });
    }
};
