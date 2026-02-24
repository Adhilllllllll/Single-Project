import { useEffect, useRef, useCallback, useState } from "react";
import { useSelector } from "react-redux";
import { initializeSocket, disconnectSocket, getSocket } from "./socketClient";

/**
 * Custom hook for socket connection management
 * Automatically connects when user is authenticated
 */
export const useSocket = () => {
    const { token, isAuthenticated } = useSelector((state) => state.auth);
    const socketInitialized = useRef(false);

    useEffect(() => {
        if (isAuthenticated && token && !socketInitialized.current) {
            initializeSocket(token);
            socketInitialized.current = true;
        }

        return () => {
            if (!isAuthenticated && socketInitialized.current) {
                disconnectSocket();
                socketInitialized.current = false;
            }
        };
    }, [isAuthenticated, token]);

    return getSocket();
};

/**
 * Hook for listening to socket events
 * @param {string} eventName - Custom event name (e.g., "socket:notification")
 * @param {function} callback - Handler function
 */
export const useSocketEvent = (eventName, callback) => {
    const savedCallback = useRef(callback);

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        const handler = (event) => {
            savedCallback.current(event.detail);
        };

        window.addEventListener(eventName, handler);
        return () => window.removeEventListener(eventName, handler);
    }, [eventName]);
};

/**
 * Hook for chat functionality
 */
export const useChat = (conversationId) => {
    const socket = getSocket();
    const [messages, setMessages] = useState([]);

    // Join conversation on mount
    useEffect(() => {
        if (conversationId && socket?.connected) {
            socket.emit("chat:join", { conversationId });

            return () => {
                socket.emit("chat:leave", { conversationId });
            };
        }
    }, [conversationId, socket]);

    // Listen for new messages
    useSocketEvent("socket:chatMessage", (message) => {
        if (message.conversationId === conversationId) {
            setMessages((prev) => [...prev, message]);
        }
    });

    const sendMessage = useCallback((content) => {
        if (socket?.connected && content.trim()) {
            socket.emit("chat:send", { conversationId, content });
        }
    }, [conversationId, socket]);

    return { messages, sendMessage, setMessages };
};

/**
 * Hook for review chat functionality
 */
export const useReviewChat = (reviewSessionId) => {
    const socket = getSocket();
    const [messages, setMessages] = useState([]);

    // Join review chat on mount
    useEffect(() => {
        if (reviewSessionId && socket?.connected) {
            socket.emit("reviewChat:join", { reviewSessionId });

            return () => {
                socket.emit("reviewChat:leave", { reviewSessionId });
            };
        }
    }, [reviewSessionId, socket]);

    // Listen for new messages
    useSocketEvent("socket:reviewChatMessage", (message) => {
        if (message.reviewSessionId === reviewSessionId) {
            setMessages((prev) => [...prev, message]);
        }
    });

    const sendMessage = useCallback((content) => {
        if (socket?.connected && content.trim()) {
            socket.emit("reviewChat:send", { reviewSessionId, content });
        }
    }, [reviewSessionId, socket]);

    return { messages, sendMessage, setMessages };
};

/**
 * Hook for notifications
 */
export const useNotifications = () => {
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);

    // Listen for new notifications
    useSocketEvent("socket:notification", (notification) => {
        setNotifications((prev) => [notification, ...prev]);
        setUnreadCount((prev) => prev + 1);
    });

    // Listen for pending notifications on connect
    useSocketEvent("socket:pendingNotifications", (pending) => {
        setNotifications(pending);
        setUnreadCount(pending.length);
    });

    return { notifications, unreadCount, setNotifications, setUnreadCount };
};
