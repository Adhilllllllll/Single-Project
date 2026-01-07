const router = require("express").Router();
const studentProfileController = require("./studentProfileController");
const authMiddleware = require("../../middlewares/authMiddleware");
const { uploadAvatar, uploadDocument } = require("../../middlewares/upload");

/* =======================
   DASHBOARD
======================= */
router.get(
    "/dashboard",
    authMiddleware("student"),
    studentProfileController.getDashboard
);

/* =======================
   PROFILE
======================= */
router.get(
    "/me",
    authMiddleware("student"),
    studentProfileController.getProfile
);

/* =======================
   CHANGE PASSWORD
======================= */
router.patch(
    "/change-password",
    authMiddleware("student"),
    studentProfileController.changePassword
);

/* =======================
   AVATAR UPLOAD
======================= */
router.post(
    "/avatar",
    authMiddleware("student"),
    uploadAvatar.single("avatar"),
    studentProfileController.uploadAvatar
);

/* =======================
   PROGRESS SUMMARY
======================= */
router.get(
    "/progress-summary",
    authMiddleware("student"),
    studentProfileController.getProgressSummary
);

/* =======================
   DOCUMENTS
======================= */
router.get(
    "/documents",
    authMiddleware("student"),
    studentProfileController.getDocuments
);

router.post(
    "/documents",
    authMiddleware("student"),
    uploadDocument.single("document"),
    studentProfileController.uploadDocument
);

router.delete(
    "/documents/:documentId",
    authMiddleware("student"),
    studentProfileController.deleteDocument
);

module.exports = router;
