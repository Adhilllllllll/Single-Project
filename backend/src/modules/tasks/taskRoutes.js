const router = require("express").Router();
const taskController = require("./taskController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { uploadTask } = require("../../middlewares/upload");

/* =======================
   STUDENT TASKS
======================= */
router.get(
    "/student/tasks",
    authMiddleware("student"),
    taskController.getStudentTasks
);

router.patch(
    "/student/tasks/:taskId/status",
    authMiddleware("student"),
    taskController.updateTaskStatus
);

router.post(
    "/student/tasks/:taskId/upload",
    authMiddleware("student"),
    uploadTask.single("attachment"),
    taskController.uploadTaskAttachment
);

/* =======================
   STUDENT WORKSHOPS
======================= */
router.get(
    "/student/workshops",
    authMiddleware("student"),
    taskController.getStudentWorkshops
);

router.patch(
    "/student/workshops/:workshopId/attend",
    authMiddleware("student"),
    taskController.markAttendance
);

router.get(
    "/student/workshops/:workshopId/materials",
    authMiddleware("student"),
    taskController.getWorkshopMaterials
);

/* =======================
   ADVISOR TASKS
======================= */
// Create new task for student(s)
router.post(
    "/advisor/tasks",
    authMiddleware("advisor"),
    taskController.createTask
);

// Get all tasks created by this advisor
router.get(
    "/advisor/tasks",
    authMiddleware("advisor"),
    taskController.getAdvisorTasks
);

// Get tasks for specific student
router.get(
    "/advisor/students/:studentId/tasks",
    authMiddleware("advisor"),
    taskController.getStudentTasksByAdvisor
);

// Update task details
router.put(
    "/advisor/tasks/:taskId",
    authMiddleware("advisor"),
    taskController.updateTask
);

// Delete task
router.delete(
    "/advisor/tasks/:taskId",
    authMiddleware("advisor"),
    taskController.deleteTask
);

// Add feedback to task submission
router.patch(
    "/advisor/tasks/:taskId/feedback",
    authMiddleware("advisor"),
    taskController.addTaskFeedback
);

// Download student attachment
router.get(
    "/advisor/tasks/:taskId/attachment",
    authMiddleware("advisor"),
    taskController.getTaskAttachment
);

module.exports = router;

