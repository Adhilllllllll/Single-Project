const router = require("express").Router();
const materialsController = require("./materialsController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { uploadMaterial } = require("../../middlewares/upload");

/* =======================
   SYLLABUS (All authenticated users)
======================= */
router.get(
    "/syllabus",
    authMiddleware("student"),
    materialsController.getSyllabusWeeks
);

/* =======================
   STUDENT CHECKLIST
======================= */
router.get(
    "/checklist",
    authMiddleware("student"),
    materialsController.getStudentChecklist
);

router.patch(
    "/checklist/:itemId/toggle",
    authMiddleware("student"),
    materialsController.toggleChecklistItem
);

router.post(
    "/checklist/:itemId/upload",
    authMiddleware("student"),
    uploadMaterial.single("attachment"),
    materialsController.uploadChecklistAttachment
);

router.get(
    "/checklist/progress",
    authMiddleware("student"),
    materialsController.getChecklistProgress
);

/* =======================
   DOCUMENT UPLOAD
======================= */
router.post(
    "/upload",
    authMiddleware("student"),
    uploadMaterial.single("document"),
    materialsController.uploadDocument
);

module.exports = router;
