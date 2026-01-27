const router = require("express").Router();
const notificationController = require("./notificationController");
const authMiddleware = require("../../middlewares/authMiddleware");

// Allow all user roles to access notifications
const anyUserAuth = authMiddleware(["student", "advisor", "reviewer", "admin"]);

/* =======================
   GET NOTIFICATIONS
======================= */
router.get(
    "/",
    anyUserAuth,
    notificationController.getNotifications
);

/* =======================
   GET UNREAD COUNT
======================= */
router.get(
    "/unread-count",
    anyUserAuth,
    notificationController.getUnreadCount
);

/* =======================
   MARK AS READ
======================= */
router.patch(
    "/:notificationId/read",
    anyUserAuth,
    notificationController.markAsRead
);

/* =======================
   MARK ALL AS READ
======================= */
router.patch(
    "/read-all",
    anyUserAuth,
    notificationController.markAllAsRead
);

/* =======================
   DELETE NOTIFICATION
======================= */
router.delete(
    "/:notificationId",
    anyUserAuth,
    notificationController.deleteNotification
);

/* =======================
   ADMIN - SEND NOTIFICATION
======================= */
router.post(
    "/admin/send",
    authMiddleware("admin"),
    notificationController.sendAdminNotification
);

/* =======================
   ADMIN - GET SENT NOTIFICATIONS
======================= */
router.get(
    "/admin/sent",
    authMiddleware("admin"),
    notificationController.getAdminSentNotifications
);

/* =======================
   ADMIN - CLEANUP OLD NOTIFICATIONS
======================= */
router.delete(
    "/admin/cleanup",
    authMiddleware("admin"),
    notificationController.cleanupOldNotifications
);

module.exports = router;


