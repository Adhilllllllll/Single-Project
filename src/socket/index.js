const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const User = require("../modules/users/User");
const Student = require("../modules/students/student");

// Import socket handlers
const chatSocketHandler = require("./chat.socket");
const reviewChatSocketHandler = require("./reviewChat.socket");
const notificationSocketHandler = require("./notification.socket");

// Store online users: userId -> Set of socketIds
const onlineUsers = new Map();

/**
 * Initialize Socket.IO with JWT authentication
 * @param {http.Server} httpServer
 */
const initializeSocket = (httpServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.CLIENT_URL || "http://localhost:5173",
            methods: ["GET", "POST"],
            credentials: true,
        },
    });

    // JWT Authentication Middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace("Bearer ", "");

            if (!token) {
                return next(new Error("Authentication required"));
            }

            // Verify JWT - use same secret as REST API auth middleware
            const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

            // Find user in User or Student collection
            let user = await User.findById(decoded.id).select("-passwordHash");
            let userModel = "User";

            if (!user) {
                user = await Student.findById(decoded.id).select("-passwordHash");
                userModel = "Student";
            }

            if (!user) {
                return next(new Error("User not found"));
            }

            // Attach user info to socket
            socket.userId = user._id.toString();
            socket.userRole = user.role || "student";
            socket.userModel = userModel;
            socket.userName = user.name;

            next();
        } catch (err) {
            console.error("Socket auth error:", err.message);
            return next(new Error("Invalid token"));
        }
    });

    // Connection handler
    io.on("connection", (socket) => {
        const { userId, userRole, userName } = socket;
        console.log(`🔌 Socket connected: ${userName} (${userRole}) - ${socket.id}`);

        // Track online users
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Auto-join personal room for direct notifications
        socket.join(`user:${userId}`);

        // Initialize socket handlers
        chatSocketHandler(io, socket, onlineUsers);
        reviewChatSocketHandler(io, socket, onlineUsers);
        notificationSocketHandler(io, socket, onlineUsers);

        // Handle disconnect
        socket.on("disconnect", () => {
            console.log(`❌ Socket disconnected: ${userName} - ${socket.id}`);

            // Remove from online users
            const userSockets = onlineUsers.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    onlineUsers.delete(userId);
                }
            }
        });

        // Error handler
        socket.on("error", (err) => {
            console.error(`Socket error for ${userName}:`, err);
        });
    });

    // Make io accessible globally for emitting from REST controllers
    global.io = io;
    global.onlineUsers = onlineUsers;

    console.log("✅ Socket.IO initialized with JWT authentication");

    return io;
};

/**
 * Check if a user is online
 */
const isUserOnline = (userId) => {
    return onlineUsers.has(userId) && onlineUsers.get(userId).size > 0;
};

/**
 * Emit to a specific user (all their connected sockets)
 */
const emitToUser = (userId, event, data) => {
    if (global.io) {
        global.io.to(`user:${userId}`).emit(event, data);
    }
};

module.exports = {
    initializeSocket,
    isUserOnline,
    emitToUser,
    onlineUsers,
};
