/**
 * ============================================================================
 *    FIREBASE MESSAGING SERVICE WORKER
 *    Handles background push notifications for FCM
 * ============================================================================
 *
 * PLACEMENT: Must be in public/ root for proper scope
 * REGISTRATION: Registered explicitly in firebase.js
 *
 * RESPONSIBILITIES:
 * - Receive background push notifications when app is closed/backgrounded
 * - Display notification with proper formatting
 * - Handle notification click → deep link to appropriate page
 */

// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

// Firebase configuration - MUST match your Firebase project
// These values will be replaced during build or loaded from env
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase in the service worker
firebase.initializeApp(firebaseConfig);

// Get messaging instance
const messaging = firebase.messaging();

/**
 * Handle background messages
 * This is called when the app is closed or in background
 */
messaging.onBackgroundMessage((payload) => {
    console.log('[SW] Background message received:', payload);

    const { notification, data } = payload;

    // Build notification options
    const notificationOptions = {
        body: notification?.body || data?.body || 'You have a new notification',
        icon: notification?.icon || '/notification-icon.png',
        badge: '/badge-icon.png',
        tag: data?.chatId || data?.type || 'default', // Prevent duplicate notifications
        renotify: true,
        requireInteraction: false,
        vibrate: [200, 100, 200],
        data: {
            url: data?.url || '/',
            type: data?.type || 'GENERAL',
            chatId: data?.chatId,
            reviewId: data?.reviewId,
            timestamp: Date.now(),
        },
    };

    const title = notification?.title || data?.title || 'New Notification';

    // Show the notification
    self.registration.showNotification(title, notificationOptions);
});

/**
 * Handle notification click
 * Opens the appropriate page based on notification data
 */
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.notification);

    const { data } = event.notification;
    const url = data?.url || '/';

    // Close the notification
    event.notification.close();

    // Open or focus the app window
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // Check if app is already open
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        // Navigate to the URL and focus
                        client.navigate(url);
                        return client.focus();
                    }
                }
                // Open new window if app not open
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

/**
 * Handle push event (fallback for when message format differs)
 */
self.addEventListener('push', (event) => {
    console.log('[SW] Push event received');

    // Only handle if not already handled by onBackgroundMessage
    if (event.data) {
        try {
            const payload = event.data.json();

            // Check if this is a data-only message (no notification field)
            if (!payload.notification && payload.data) {
                const { data } = payload;

                const notificationOptions = {
                    body: data.body || 'You have a new notification',
                    icon: '/notification-icon.png',
                    badge: '/badge-icon.png',
                    data: {
                        url: data.url || '/',
                        type: data.type || 'GENERAL',
                    },
                };

                event.waitUntil(
                    self.registration.showNotification(
                        data.title || 'Notification',
                        notificationOptions
                    )
                );
            }
        } catch (err) {
            console.error('[SW] Error processing push:', err);
        }
    }
});

console.log('[SW] Firebase Messaging Service Worker loaded');
