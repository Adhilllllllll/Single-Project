const router = require("express").Router();
const notificationController = require("./notificationController");
const authMiddleware = require("../../middlewares/authMiddleware");

/* =======================
   GET NOTIFICATIONS
======================= */
router.get(
    "/",
    authMiddleware("student"),
    notificationController.getNotifications
);

/* =======================
   GET UNREAD COUNT
======================= */
router.get(
    "/unread-count",
    authMiddleware("student"),
    notificationController.getUnreadCount
);

/* =======================
   MARK AS READ
======================= */
router.patch(
    "/:notificationId/read",
    authMiddleware("student"),
    notificationController.markAsRead
);

/* =======================
   MARK ALL AS READ
======================= */
router.patch(
    "/read-all",
    authMiddleware("student"),
    notificationController.markAllAsRead
);

/* =======================
   DELETE NOTIFICATION
======================= */
router.delete(
    "/:notificationId",
    authMiddleware("student"),
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

module.exports = router;

