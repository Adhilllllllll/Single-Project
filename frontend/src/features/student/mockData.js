export const REVIEWS = [
    { id: 1, date: "Dec 28, 2025", time: "11:00 AM", reviewer: "Dr. Sarah Wilson", mode: "Online", status: "Scheduled" },
    { id: 2, date: "Jan 15, 2026", time: "10:00 AM", reviewer: "Prof. John Doe", mode: "F2F", status: "Pending" },
    { id: 3, date: "Nov 20, 2025", time: "09:00 AM", reviewer: "Dr. Sarah Wilson", mode: "Online", status: "Completed" },
];

export const TASKS = [
    { id: 1, title: "Submit Project Proposal", deadline: "Dec 10, 2025", priority: "High", status: "Pending", attachmentRequired: true },
    { id: 2, title: "Complete Module 3 Assignment", deadline: "Dec 12, 2025", priority: "Medium", status: "In Progress", attachmentRequired: true },
    { id: 3, title: "Review Python Documentation", deadline: "Dec 8, 2025", priority: "Low", status: "Completed", attachmentRequired: false },
    { id: 4, title: "Prepare Review Materials", deadline: "Dec 9, 2025", priority: "High", status: "Pending", attachmentRequired: true },
];

export const WORKSHOPS = [
    { id: 1, title: "Advanced Python Techniques", date: "Dec 15, 2025", time: "2:00 PM", status: "Upcoming", attendance: "Not Attended" },
    { id: 2, title: "Code Review Best Practices", date: "Dec 3, 2025", time: "10:00 AM", status: "Completed", attendance: "Attended" },
    { id: 3, title: "Project Presentation Skills", date: "Nov 28, 2025", time: "3:00 PM", status: "Completed", attendance: "Attended" },
];

export const MATERIALS = [
    { id: 1, title: "Capstone Guidelines.pdf", type: "PDF", size: "2.4 MB" },
    { id: 2, title: "Project Template.docx", type: "DOCX", size: "1.1 MB" },
    { id: 3, title: "Research Methodology.pptx", type: "PPTX", size: "5.0 MB" },
];

// Week-based syllabus with resources
export const SYLLABUS_WEEKS = [
    {
        id: 1,
        week: 1,
        title: "Introduction to Python",
        resources: [
            { id: 1, title: "Python Basics.pdf", type: "pdf", size: "2.4 MB", url: "#" },
            { id: 2, title: "Python Tutorial Video", type: "video", duration: "45 min", url: "#" },
        ],
    },
    {
        id: 2,
        week: 2,
        title: "Data Structures",
        resources: [
            { id: 3, title: "Data Structures Guide.pdf", type: "pdf", size: "3.1 MB", url: "#" },
            { id: 4, title: "Arrays and Lists Tutorial", type: "video", duration: "30 min", url: "#" },
            { id: 5, title: "Practice Problems", type: "link", url: "#" },
        ],
    },
    {
        id: 3,
        week: 3,
        title: "Object Oriented Programming",
        resources: [
            { id: 6, title: "OOP Concepts.pdf", type: "pdf", size: "1.8 MB", url: "#" },
            { id: 7, title: "OOP in Python Video", type: "video", duration: "55 min", url: "#" },
        ],
    },
];

// Pre-review checklist items
export const CHECKLIST_ITEMS = [
    { id: 1, title: "Review project requirements", completed: true, requiresUpload: false },
    { id: 2, title: "Prepare presentation slides", completed: true, requiresUpload: false },
    { id: 3, title: "Upload source code", completed: false, requiresUpload: true },
    { id: 4, title: "Complete documentation", completed: false, requiresUpload: true },
    { id: 5, title: "Test all functionality", completed: false, requiresUpload: true },
];

export const NOTIFICATIONS = [
    { id: 1, title: "Review Scheduled", message: "Your review with Dr. Wilson is scheduled for Dec 28.", time: "2 hours ago", type: "info" },
    { id: 2, title: "Abstract Approved", message: "Your abstract submission has been approved.", time: "Yesterday", type: "success" },
    { id: 3, title: "System Maintenance", message: "The system will be undergoing maintenance tonight.", time: "2 days ago", type: "warning" },
];
