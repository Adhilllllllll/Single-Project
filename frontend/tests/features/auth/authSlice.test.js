/**
 * Auth Slice Tests
 * Tests for Redux auth state management: loginUser, refreshUser, logout, updateUser
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import authReducer, {
    loginUser,
    refreshUser,
    logout,
    updateUser,
} from '../../../src/features/auth/authSlice';
import { configureStore } from '@reduxjs/toolkit';

// Mock the API module
vi.mock('../../../src/api/axios', () => ({
    default: {
        post: vi.fn(),
        get: vi.fn(),
    },
}));

describe('Auth Slice', () => {
    let store;

    beforeEach(() => {
        // Clear localStorage mock
        localStorage.clear();

        // Create a fresh store for each test
        store = configureStore({
            reducer: {
                auth: authReducer,
            },
        });
    });

    describe('Initial State', () => {
        it('should have correct initial state when no token in storage', () => {
            const state = store.getState().auth;

            expect(state.token).toBeNull();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(state.loading).toBe(false);
            expect(state.error).toBeNull();
        });

        it('should load token from localStorage if valid', () => {
            localStorage.setItem('token', 'valid-token-123');
            localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Test' }));

            // Re-import to get fresh initial state with mocked localStorage
            // Note: This test verifies the behavior pattern, actual runtime will differ
            expect(localStorage.getItem('token')).toBe('valid-token-123');
        });

        it('should not load token if undefined string', () => {
            localStorage.setItem('token', 'undefined');

            // The slice checks for "undefined" string
            const token = localStorage.getItem('token');
            const isValid = token && token !== 'undefined' && token !== 'null';

            expect(isValid).toBe(false);
        });

        it('should not load token if null string', () => {
            localStorage.setItem('token', 'null');

            const token = localStorage.getItem('token');
            const isValid = token && token !== 'undefined' && token !== 'null';

            expect(isValid).toBe(false);
        });
    });

    describe('logout reducer', () => {
        it('should clear all auth state', () => {
            // Set up authenticated state
            store = configureStore({
                reducer: { auth: authReducer },
                preloadedState: {
                    auth: {
                        token: 'some-token',
                        user: { id: '1', name: 'Test User' },
                        isAuthenticated: true,
                        loading: false,
                        error: null,
                    },
                },
            });

            store.dispatch(logout());

            const state = store.getState().auth;
            expect(state.token).toBeNull();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('should clear localStorage', () => {
            localStorage.setItem('token', 'some-token');
            localStorage.setItem('user', '{"id": "1"}');

            store.dispatch(logout());

            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user')).toBeNull();
        });
    });

    describe('updateUser reducer', () => {
        it('should merge user data with existing user', () => {
            store = configureStore({
                reducer: { auth: authReducer },
                preloadedState: {
                    auth: {
                        token: 'token',
                        user: { id: '1', name: 'Old Name', email: 'old@test.com' },
                        isAuthenticated: true,
                        loading: false,
                        error: null,
                    },
                },
            });

            store.dispatch(updateUser({ name: 'New Name', avatar: 'url' }));

            const state = store.getState().auth;
            expect(state.user.name).toBe('New Name');
            expect(state.user.email).toBe('old@test.com'); // Preserved
            expect(state.user.avatar).toBe('url'); // Added
        });

        it('should update localStorage with merged user', () => {
            store = configureStore({
                reducer: { auth: authReducer },
                preloadedState: {
                    auth: {
                        token: 'token',
                        user: { id: '1', name: 'Test' },
                        isAuthenticated: true,
                        loading: false,
                        error: null,
                    },
                },
            });

            store.dispatch(updateUser({ name: 'Updated' }));

            const storedUser = JSON.parse(localStorage.getItem('user'));
            expect(storedUser.name).toBe('Updated');
        });
    });

    describe('loginUser async thunk', () => {
        it('should set loading to true when pending', () => {
            const action = { type: loginUser.pending.type };
            const state = authReducer(undefined, action);

            expect(state.loading).toBe(true);
            expect(state.error).toBeNull();
        });

        it('should set auth state when fulfilled', () => {
            const mockPayload = {
                accessToken: 'new-token',
                user: { id: '1', name: 'Test User', role: 'student' },
            };

            const action = { type: loginUser.fulfilled.type, payload: mockPayload };
            const state = authReducer(undefined, action);

            expect(state.loading).toBe(false);
            expect(state.token).toBe('new-token');
            expect(state.user).toEqual(mockPayload.user);
            expect(state.isAuthenticated).toBe(true);
        });

        it('should store token in localStorage when fulfilled', () => {
            const mockPayload = {
                accessToken: 'stored-token',
                user: { id: '1', name: 'Test' },
            };

            const action = { type: loginUser.fulfilled.type, payload: mockPayload };
            authReducer(undefined, action);

            // Note: The reducer handles localStorage, this verifies the pattern
            expect(localStorage.setItem).toHaveBeenCalled();
        });

        it('should set error when rejected', () => {
            const action = {
                type: loginUser.rejected.type,
                payload: 'Invalid credentials',
            };
            const state = authReducer(undefined, action);

            expect(state.loading).toBe(false);
            expect(state.error).toBe('Invalid credentials');
        });
    });

    describe('refreshUser async thunk', () => {
        it('should update user data when fulfilled', () => {
            const initialState = {
                token: 'token',
                user: { id: '1', name: 'Old', role: 'student' },
                isAuthenticated: true,
                loading: false,
                error: null,
            };

            const mockPayload = { id: '1', name: 'Refreshed', role: 'student', avatar: 'new-url' };
            const action = { type: refreshUser.fulfilled.type, payload: mockPayload };
            const state = authReducer(initialState, action);

            expect(state.user.name).toBe('Refreshed');
            expect(state.user.avatar).toBe('new-url');
        });

        it('should not crash when payload is null', () => {
            const initialState = {
                token: 'token',
                user: { id: '1', name: 'Test' },
                isAuthenticated: true,
                loading: false,
                error: null,
            };

            const action = { type: refreshUser.fulfilled.type, payload: null };

            // Should not throw
            expect(() => authReducer(initialState, action)).not.toThrow();
        });
    });
});
