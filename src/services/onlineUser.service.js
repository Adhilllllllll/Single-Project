/**
 * ============================================================================
 *    ONLINE USER TRACKING SERVICE
 *    Redis-Ready Abstraction for Horizontal Scaling
 * ============================================================================
 *
 * ARCHITECTURE:
 *   - Abstracts user online state behind a clean API
 *   - Currently uses in-memory Map (single instance)
 *   - Ready for Redis replacement when scaling horizontally
 *
 * USAGE:
 *   import onlineUserService from "../services/onlineUser.service";
 *   onlineUserService.setUserOnline(userId, socketId);
 *
 * TODO: Replace Map with Redis when scaling horizontally
 *   - Use Redis SET for user socket IDs
 *   - Use Redis EXPIRE for automatic cleanup
 *   - Consider Redis Pub/Sub for cross-instance events
 */

// TODO: Replace with Redis client when scaling horizontally
// const redis = require("redis");
// const client = redis.createClient();

/**
 * In-memory storage for online users
 * Structure: userId -> Set<socketId>
 * 
 * TODO: Replace with Redis implementation:
 *   - Key: `online:${userId}`
 *   - Value: SET of socket IDs
 *   - TTL: Auto-expire on disconnect
 */
const onlineUsers = new Map();

/**
 * Mark a user as online with a socket connection
 * @param {string} userId - User ID
 * @param {string} socketId - Socket.IO connection ID
 * 
 * TODO: Redis implementation:
 *   await client.sAdd(`online:${userId}`, socketId);
 *   await client.expire(`online:${userId}`, 86400); // 24h TTL
 */
const setUserOnline = (userId, socketId) => {
    if (!userId || !socketId) return;

    if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
    }
    onlineUsers.get(userId).add(socketId);

    console.log(`🟢 User online: ${userId} (sockets: ${onlineUsers.get(userId).size})`);
};

/**
 * Remove a socket from a user's connections
 * If no sockets remain, user is considered offline
 * @param {string} userId - User ID
 * @param {string} socketId - Socket.IO connection ID to remove
 * @returns {boolean} - True if user is now completely offline
 * 
 * TODO: Redis implementation:
 *   await client.sRem(`online:${userId}`, socketId);
 *   const remaining = await client.sCard(`online:${userId}`);
 *   return remaining === 0;
 */
const removeSocket = (userId, socketId) => {
    if (!userId || !socketId) return true;

    const userSockets = onlineUsers.get(userId);
    if (!userSockets) return true;

    userSockets.delete(socketId);

    if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        console.log(`🔴 User offline: ${userId}`);
        return true;
    }

    console.log(`📱 Socket removed: ${userId} (remaining: ${userSockets.size})`);
    return false;
};

/**
 * Mark a user as completely offline (remove all sockets)
 * Use this for forced logout or user deletion
 * @param {string} userId - User ID
 * 
 * TODO: Redis implementation:
 *   await client.del(`online:${userId}`);
 */
const setUserOffline = (userId) => {
    if (!userId) return;

    onlineUsers.delete(userId);
    console.log(`🔴 User forced offline: ${userId}`);
};

/**
 * Check if a user is currently online
 * @param {string} userId - User ID
 * @returns {boolean} - True if user has at least one active socket
 * 
 * TODO: Redis implementation:
 *   const count = await client.sCard(`online:${userId}`);
 *   return count > 0;
 */
const isUserOnline = (userId) => {
    if (!userId) return false;

    const userSockets = onlineUsers.get(userId);
    return userSockets && userSockets.size > 0;
};

/**
 * Get all socket IDs for a user
 * @param {string} userId - User ID
 * @returns {Set<string>|null} - Set of socket IDs or null if offline
 * 
 * TODO: Redis implementation:
 *   const sockets = await client.sMembers(`online:${userId}`);
 *   return sockets.length > 0 ? new Set(sockets) : null;
 */
const getUserSockets = (userId) => {
    if (!userId) return null;

    return onlineUsers.get(userId) || null;
};

/**
 * Get the count of online users
 * Useful for monitoring and dashboards
 * @returns {number} - Number of online users
 * 
 * TODO: Redis implementation:
 *   const keys = await client.keys("online:*");
 *   return keys.length;
 */
const getOnlineCount = () => {
    return onlineUsers.size;
};

/**
 * Get all online user IDs
 * Use sparingly - for admin dashboards only
 * @returns {string[]} - Array of online user IDs
 * 
 * TODO: Redis implementation:
 *   const keys = await client.keys("online:*");
 *   return keys.map(k => k.replace("online:", ""));
 */
const getOnlineUserIds = () => {
    return Array.from(onlineUsers.keys());
};

/**
 * Get the raw Map (for backward compatibility during migration)
 * @deprecated Use specific methods instead
 * @returns {Map} - The internal onlineUsers Map
 */
const getOnlineUsersMap = () => {
    console.warn("⚠️  getOnlineUsersMap is deprecated. Use specific service methods.");
    return onlineUsers;
};

module.exports = {
    setUserOnline,
    removeSocket,
    setUserOffline,
    isUserOnline,
    getUserSockets,
    getOnlineCount,
    getOnlineUserIds,
    getOnlineUsersMap, // Deprecated, for backward compatibility
};
