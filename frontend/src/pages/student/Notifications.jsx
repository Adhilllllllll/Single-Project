import React, { useEffect, useCallback, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
} from "../../features/student/studentSlice";

/* ============================================
   Notification Type Icons
============================================ */
const NotificationIcon = React.memo(({ type }) => {
    switch (type) {
        case "review_reminder":
        case "review_scheduled":
            return (
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                </div>
            );
        case "feedback_available":
            return (
                <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                    </svg>
                </div>
            );
        case "new_message":
            return (
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                </div>
            );
        case "admin_broadcast":
            return (
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                </div>
            );
        case "task_deadline":
        case "task_assigned":
            return (
                <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
        case "review_completed":
        case "success":
            return (
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
            );
        default:
            return (
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>
            );
    }
});

NotificationIcon.displayName = "NotificationIcon";

/* ============================================
   Time Formatter
============================================ */
const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
        return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
        return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else if (diffDays === 1) {
        return "Yesterday";
    } else if (diffDays < 7) {
        return `${diffDays} days ago`;
    } else {
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }
};

const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    });
};

/* ============================================
   Skeleton Loader
============================================ */
const SkeletonNotification = () => (
    <div className="p-4 flex items-start gap-4 animate-pulse">
        <div className="w-10 h-10 bg-slate-200 rounded-lg"></div>
        <div className="flex-1">
            <div className="h-4 bg-slate-200 rounded w-32 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-64 mb-2"></div>
            <div className="h-3 bg-slate-200 rounded w-20"></div>
        </div>
    </div>
);

/* ============================================
   Notification Detail Modal
============================================ */
const NotificationModal = React.memo(({ notification, onClose, onMarkAsRead }) => {
    if (!notification) return null;

    const handleMarkAsRead = () => {
        if (!notification.isRead) {
            onMarkAsRead(notification.id);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div
                className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                        <NotificationIcon type={notification.type} />
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">{notification.title}</h3>
                            <p className="text-sm text-slate-500">{formatFullDate(notification.createdAt)}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 p-1"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className="p-5 overflow-y-auto max-h-[50vh]">
                    <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{notification.message}</p>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                    {!notification.isRead && (
                        <button
                            onClick={() => { handleMarkAsRead(); onClose(); }}
                            className="px-4 py-2 text-sm font-medium text-orange-600 hover:text-orange-700"
                        >
                            Mark as Read
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
});

NotificationModal.displayName = "NotificationModal";

/* ============================================
   Notification Item Component
============================================ */
const NotificationItem = React.memo(({ notification, onMarkAsRead, onOpen }) => {
    const isUnread = !notification.isRead;

    return (
        <div
            onClick={() => onOpen(notification)}
            className={`flex items-start gap-4 p-4 transition-colors cursor-pointer ${isUnread
                    ? "bg-orange-50 border-l-4 border-orange-500 hover:bg-orange-100"
                    : "hover:bg-slate-50"
                }`}
        >
            <NotificationIcon type={notification.type} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900">{notification.title}</h4>
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-2">
                            {formatTimeAgo(notification.createdAt)}
                        </p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                        {isUnread && (
                            <>
                                <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                                <button
                                    onClick={(e) => { e.stopPropagation(); onMarkAsRead(notification.id); }}
                                    className="text-xs text-orange-600 hover:text-orange-700 font-medium whitespace-nowrap"
                                >
                                    Mark as read
                                </button>
                            </>
                        )}
                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    );
});

NotificationItem.displayName = "NotificationItem";

/* ============================================
   Main Notifications Component
============================================ */
const Notifications = () => {
    const dispatch = useDispatch();
    const [selectedNotification, setSelectedNotification] = useState(null);
    const {
        notifications,
        unreadCount,
        notificationsLoading,
        error,
    } = useSelector((state) => state.student);

    // Fetch notifications on mount
    useEffect(() => {
        dispatch(fetchNotifications());
    }, [dispatch]);

    // Handlers
    const handleMarkAsRead = useCallback((notificationId) => {
        dispatch(markNotificationRead(notificationId));
    }, [dispatch]);

    const handleMarkAllAsRead = useCallback(() => {
        dispatch(markAllNotificationsRead());
    }, [dispatch]);

    const handleOpenNotification = useCallback((notification) => {
        setSelectedNotification(notification);
        // Auto-mark as read when opening
        if (!notification.isRead) {
            dispatch(markNotificationRead(notification.id));
        }
    }, [dispatch]);

    const handleCloseModal = useCallback(() => {
        setSelectedNotification(null);
    }, []);

    // Subtitle text
    const subtitleText = useMemo(() => {
        if (unreadCount === 0) {
            return "No unread notifications";
        } else if (unreadCount === 1) {
            return "You have 1 unread notification";
        } else {
            return `You have ${unreadCount} unread notifications`;
        }
    }, [unreadCount]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
                    <p className="text-slate-500">{subtitleText}</p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={handleMarkAllAsRead}
                        className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}

            {/* Notifications List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {notificationsLoading ? (
                    <div className="divide-y divide-slate-100">
                        <SkeletonNotification />
                        <SkeletonNotification />
                        <SkeletonNotification />
                        <SkeletonNotification />
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {notifications.map((notification) => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkAsRead={handleMarkAsRead}
                                onOpen={handleOpenNotification}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <svg className="w-12 h-12 mx-auto text-slate-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-slate-500">No notifications yet</p>
                    </div>
                )}
            </div>

            {/* Notification Detail Modal */}
            {selectedNotification && (
                <NotificationModal
                    notification={selectedNotification}
                    onClose={handleCloseModal}
                    onMarkAsRead={handleMarkAsRead}
                />
            )}
        </div>
    );
};

export default Notifications;
