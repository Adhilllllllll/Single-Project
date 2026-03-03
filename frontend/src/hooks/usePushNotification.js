/**
 * ============================================================================
 *    PUSH NOTIFICATION HOOK
 *    React hook for managing FCM push notifications
 * ============================================================================
 *
 * USAGE:
 *   const { isEnabled, enablePush, disablePush } = usePushNotification();
 *
 * RESPONSIBILITIES:
 *   - Request notification permission
 *   - Register/unregister FCM token with backend
 *   - Handle foreground notifications
 *   - Integrate with existing socket notification system
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSelector } from 'react-redux';
import {
    requestNotificationPermission,
    getFcmToken,
    onForegroundMessage,
    checkPushSupport,
} from '../utils/firebase';

// API base URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for push notification management
 */
export const usePushNotification = () => {
    const { token: authToken, isAuthenticated } = useSelector((state) => state.auth);

    const [isSupported, setIsSupported] = useState(false);
    const [permission, setPermission] = useState('default');
    const [isEnabled, setIsEnabled] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fcmToken, setFcmToken] = useState(null);

    const unsubscribeRef = useRef(null);

    /**
     * Check push notification support on mount
     */
    useEffect(() => {
        const checkSupport = async () => {
            const support = await checkPushSupport();
            setIsSupported(support.supported);
            setPermission(support.permission);
            setIsEnabled(support.canReceive);
        };
        checkSupport();
    }, []);

    /**
     * Register FCM token with backend
     */
    const registerToken = useCallback(async (token) => {
        if (!authToken || !token) return false;

        try {
            const response = await fetch(`${API_URL}/api/notifications/register-token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    token,
                    platform: 'web',
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to register token');
            }

            const data = await response.json();
            console.log('FCM token registered:', data.isNew ? 'new' : 'updated');
            return true;
        } catch (err) {
            console.error('Token registration error:', err);
            setError(err.message);
            return false;
        }
    }, [authToken]);

    /**
     * Unregister FCM token from backend (on logout)
     */
    const unregisterToken = useCallback(async (token) => {
        if (!authToken || !token) return false;

        try {
            const response = await fetch(`${API_URL}/api/notifications/remove-token`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({ token }),
            });

            if (!response.ok) {
                throw new Error('Failed to remove token');
            }

            console.log('FCM token unregistered');
            return true;
        } catch (err) {
            console.error('Token unregistration error:', err);
            return false;
        }
    }, [authToken]);

    /**
     * Enable push notifications
     * - Requests permission
     * - Gets FCM token
     * - Registers with backend
     * - Sets up foreground message handler
     */
    const enablePush = useCallback(async () => {
        if (!isAuthenticated) {
            setError('Must be logged in to enable push notifications');
            return false;
        }

        if (!isSupported) {
            setError('Push notifications not supported in this browser');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Request permission
            const perm = await requestNotificationPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                setError('Notification permission denied');
                setIsLoading(false);
                return false;
            }

            // Get FCM token
            const token = await getFcmToken();

            if (!token) {
                setError('Failed to get FCM token');
                setIsLoading(false);
                return false;
            }

            setFcmToken(token);

            // Register with backend
            const registered = await registerToken(token);

            if (!registered) {
                setIsLoading(false);
                return false;
            }

            // Set up foreground message handler
            const unsubscribe = onForegroundMessage((payload) => {
                // Dispatch custom event for the socket/notification system to handle
                window.dispatchEvent(
                    new CustomEvent('push:foreground', { detail: payload })
                );

                // Show browser notification for foreground messages (optional)
                // Most apps don't show notification when app is open - let the UI handle it
                console.log('Foreground push received:', payload.notification?.title);
            });

            unsubscribeRef.current = unsubscribe;
            setIsEnabled(true);
            setIsLoading(false);

            console.log('Push notifications enabled successfully');
            return true;
        } catch (err) {
            console.error('Enable push error:', err);
            setError(err.message);
            setIsLoading(false);
            return false;
        }
    }, [isAuthenticated, isSupported, registerToken]);

    /**
     * Disable push notifications
     * - Unregisters token from backend
     * - Cleans up foreground message handler
     */
    const disablePush = useCallback(async () => {
        setIsLoading(true);

        try {
            // Unregister token from backend
            if (fcmToken) {
                await unregisterToken(fcmToken);
            }

            // Clean up foreground message handler
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
                unsubscribeRef.current = null;
            }

            setFcmToken(null);
            setIsEnabled(false);
            setIsLoading(false);

            console.log('Push notifications disabled');
            return true;
        } catch (err) {
            console.error('Disable push error:', err);
            setIsLoading(false);
            return false;
        }
    }, [fcmToken, unregisterToken]);

    /**
     * Auto-enable push if previously granted and authenticated
     */
    useEffect(() => {
        if (isAuthenticated && permission === 'granted' && isSupported && !isEnabled && !isLoading) {
            // Auto-register token on login if permission was already granted
            enablePush();
        }
    }, [isAuthenticated, permission, isSupported, isEnabled, isLoading, enablePush]);

    /**
     * Cleanup on unmount or logout
     */
    useEffect(() => {
        return () => {
            if (unsubscribeRef.current) {
                unsubscribeRef.current();
            }
        };
    }, []);

    return {
        // State
        isSupported,
        permission,
        isEnabled,
        isLoading,
        error,
        fcmToken,

        // Actions
        enablePush,
        disablePush,
        registerToken,
        unregisterToken,
    };
};

export default usePushNotification;
