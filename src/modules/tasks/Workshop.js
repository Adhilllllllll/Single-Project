const mongoose = require("mongoose");

const workshopSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        time: {
            type: String,
            required: true,
        },
        duration: {
            type: Number, // in minutes
            default: 60,
        },
        status: {
            type: String,
            enum: ["Upcoming", "Completed", "Cancelled"],
            default: "Upcoming",
        },
        meetingLink: {
            type: String,
            trim: true,
        },
        materials: [{
            title: String,
            path: String,
            uploadedAt: Date,
        }],
        attendees: [{
            student: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Student",
            },
            attendance: {
                type: String,
                enum: ["Attended", "Not Attended"],
                default: "Not Attended",
            },
            joinedAt: Date,
        }],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// Indexes
workshopSchema.index({ date: 1 });
workshopSchema.index({ status: 1 });
workshopSchema.index({ "attendees.student": 1 });

module.exports = mongoose.model("Workshop", workshopSchema);
