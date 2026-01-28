const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Student",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        category: {
            type: String,
            enum: ["Coding", "Documentation", "Communication", "Research", "Project", "Other"],
            default: "Other",
        },
        deadline: {
            type: Date,
            required: true,
        },
        priority: {
            type: String,
            enum: ["High", "Medium", "Low"],
            default: "Medium",
        },
        status: {
            type: String,
            enum: ["Pending", "In Progress", "Completed", "Overdue"],
            default: "Pending",
        },
        attachmentRequired: {
            type: Boolean,
            default: false,
        },
        attachment: {
            filename: String,
            path: String,
            uploadedAt: Date,
        },
        submittedAt: {
            type: Date,
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User", // Advisor who created the task
            required: true,
        },
        // Optional link to a review session
        reviewLink: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ReviewSession",
        },
        // Advisor feedback on submission
        feedback: {
            comment: String,
            rating: {
                type: Number,
                min: 1,
                max: 10,
            },
            givenAt: Date,
            givenBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
            },
        },
    },
    { timestamps: true }
);

// Indexes
taskSchema.index({ student: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ category: 1 });

// ============================================================
// COMPOUND INDEXES FOR AGGREGATION PIPELINES
// ============================================================

// Index 1: For getStudentTasks - student + deadline sorting
// Supports: $match on student, then $sort by deadline
taskSchema.index(
    { student: 1, deadline: 1 },
    { name: "student_deadline" }
);

// Index 2: For getAdvisorTasks - advisor dashboard queries
// Supports: $match on createdBy + status + category, then $sort by deadline
taskSchema.index(
    { createdBy: 1, status: 1, deadline: 1 },
    { name: "advisor_status_deadline" }
);

// Index 3: For getStudentTasksByAdvisor - advisor + student drill-down
// Supports: $match on createdBy + student, then $sort by deadline
taskSchema.index(
    { createdBy: 1, student: 1, deadline: 1 },
    { name: "advisor_student_deadline" }
);

module.exports = mongoose.model("Task", taskSchema);

