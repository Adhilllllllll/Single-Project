export const STUDENTS = [
    { id: 1, name: "Demi Wilkinson", project: "Frontend Redesign", status: "Active", progress: 75 },
    { id: 2, name: "Orlando Diggs", project: "API Optimization", status: "Review", progress: 90 },
    { id: 3, name: "Andi Lane", project: "Database Migration", status: "Stuck", progress: 45 },
    { id: 4, name: "Kate Morrison", project: "Auth System", status: "Active", progress: 60 },
];

export const REVIEWS = [
    { id: 1, student: "Demi Wilkinson", date: "Oct 24, 2024", time: "10:00 AM", type: "Code Review", status: "Upcoming" },
    { id: 2, student: "Orlando Diggs", date: "Oct 25, 2024", time: "2:00 PM", type: "Final Defense", status: "Pending" },
];

export const SCHEDULE = [
    { id: 1, title: "Review with Demi", date: "2024-10-24", type: "review" },
    { id: 2, title: "Faculty Meeting", date: "2024-10-26", type: "meeting" },
];

export const TEMPLATES = [
    { id: 1, title: "Code Review Feedback", lastUsed: "2 days ago" },
    { id: 2, title: "Final Defense Rubric", lastUsed: "1 week ago" },
];

export const ANALYTICS = {
    totalStudents: 12,
    avgProgress: 68,
    reviewsThisWeek: 5,
    pendingScores: 2
};
