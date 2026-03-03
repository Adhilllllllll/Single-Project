/**
 * ============================================================================
 *    FIREBASE ADMIN SDK CONFIGURATION
 *    Push Notification Infrastructure for FCM
 * ============================================================================
 *
 * SETUP REQUIREMENTS:
 * 1. Create Firebase project at https://console.firebase.google.com/
 * 2. Enable Cloud Messaging
 * 3. Generate service account key (Project Settings → Service Accounts)
 * 4. Add credentials to .env (NEVER commit the JSON file)
 *
 * ENVIRONMENT VARIABLES REQUIRED:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY (with \n for newlines)
 */

const admin = require("firebase-admin");

// Track initialization state
let isInitialized = false;

/**
 * Initialize Firebase Admin SDK
 * Should be called once during server startup
 * Safe to call multiple times (idempotent)
 */
const initializeFirebase = () => {
    // Prevent multiple initializations
    if (isInitialized) {
        return admin;
    }

    // Validate required environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
        console.warn(
            "⚠️  Firebase not configured. Push notifications will be disabled.\n" +
            "   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY in .env"
        );
        return null;
    }

    try {
        // Handle private key newline replacement for Docker/EC2 compatibility
        // Environment variables may have escaped \n that need to be converted
        const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey: formattedPrivateKey,
            }),
        });

        isInitialized = true;
        console.log("✅ Firebase Admin SDK initialized successfully");

        return admin;
    } catch (error) {
        console.error("❌ Firebase initialization failed:", error.message);
        return null;
    }
};

/**
 * Get Firebase Messaging instance
 * Returns null if Firebase is not configured
 */
const getMessaging = () => {
    if (!isInitialized) {
        initializeFirebase();
    }

    if (!isInitialized) {
        return null;
    }

    return admin.messaging();
};

/**
 * Check if Firebase is properly configured and ready
 */
const isFirebaseReady = () => {
    return isInitialized;
};

/**
 * Get the Firebase Admin instance
 * Returns null if not initialized
 */
const getAdmin = () => {
    if (!isInitialized) {
        return null;
    }
    return admin;
};

module.exports = {
    initializeFirebase,
    getMessaging,
    isFirebaseReady,
    getAdmin,
};
