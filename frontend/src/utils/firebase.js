/**
 * ============================================================================
 *    FIREBASE CLIENT CONFIGURATION
 *    Push Notification Client for Web FCM
 * ============================================================================
 *
 * SETUP REQUIREMENTS:
 * 1. Create a Firebase project at https://console.firebase.google.com/
 * 2. Register a web app and get the config object
 * 3. Replace the placeholder values below with your Firebase config
 * 4. Ensure firebase-messaging-sw.js in public/ has matching config
 *
 * USAGE:
 *   import { requestNotificationPermission, getFcmToken } from '../utils/firebase';
 */

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';

// Firebase configuration - REPLACE WITH YOUR VALUES
// Get these from Firebase Console → Project Settings → Your apps → Web app
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "YOUR_API_KEY",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "YOUR_PROJECT_ID",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "YOUR_SENDER_ID",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "YOUR_APP_ID",
};

// VAPID key for web push (from Firebase Console → Cloud Messaging → Web Push certificates)
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY || "YOUR_VAPID_KEY";

// Initialize Firebase app (singleton pattern)
let app = null;
let messaging = null;

/**
 * Initialize Firebase app
 * Safe to call multiple times (idempotent)
 */
const initializeFirebase = async () => {
    // Check if messaging is supported in this browser
    const supported = await isSupported();
    if (!supported) {
        console.warn('Firebase Messaging is not supported in this browser');
        return null;
    }

    // Initialize app if not already done
    if (!getApps().length) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApps()[0];
    }

    // Get messaging instance
    try {
        messaging = getMessaging(app);
        return messaging;
    } catch (error) {
        console.error('Failed to initialize Firebase Messaging:', error);
        return null;
    }
};

/**
 * Request notification permission from the user
 * @returns {Promise<'granted' | 'denied' | 'default'>}
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.warn('Notifications not supported in this browser');
        return 'denied';
    }

    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission:', permission);
        return permission;
    } catch (error) {
        console.error('Failed to request notification permission:', error);
        return 'denied';
    }
};

/**
 * Get FCM token for this device
 * Requires notification permission to be granted
 * @returns {Promise<string | null>}
 */
export const getFcmToken = async () => {
    try {
        // Ensure Firebase is initialized
        const msgInstance = messaging || await initializeFirebase();

        if (!msgInstance) {
            console.warn('Firebase Messaging not available');
            return null;
        }

        // Check permission
        if (Notification.permission !== 'granted') {
            console.warn('Notification permission not granted');
            return null;
        }

        // Register service worker
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        console.log('Service Worker registered:', registration.scope);

        // Get token
        const token = await getToken(msgInstance, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: registration,
        });

        if (token) {
            console.log('FCM Token obtained');
            return token;
        } else {
            console.warn('No FCM token available');
            return null;
        }
    } catch (error) {
        console.error('Failed to get FCM token:', error);
        return null;
    }
};

/**
 * Set up foreground message handler
 * Called when a push notification arrives while the app is in foreground
 * @param {function} callback - Handler function receiving the message payload
 * @returns {function | null} Unsubscribe function
 */
export const onForegroundMessage = (callback) => {
    if (!messaging) {
        console.warn('Firebase Messaging not initialized');
        return null;
    }

    return onMessage(messaging, (payload) => {
        console.log('Foreground message received:', payload);
        callback(payload);
    });
};

/**
 * Check if push notifications are supported and enabled
 * @returns {Promise<{supported: boolean, permission: string}>}
 */
export const checkPushSupport = async () => {
    const supported = await isSupported();
    const permission = 'Notification' in window ? Notification.permission : 'denied';

    return {
        supported,
        permission,
        canReceive: supported && permission === 'granted',
    };
};

// Export initialized instances for direct access if needed
export { app, messaging, firebaseConfig };

// Initialize on import (but don't block)
initializeFirebase().catch(console.error);
