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

module.exports = router;
