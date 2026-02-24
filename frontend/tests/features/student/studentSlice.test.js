/**
 * Student Slice Tests
 * Tests for student-specific Redux state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import studentReducer, {
    fetchUpcomingReviews,
    fetchReviewHistory,
    fetchStudentProgress,
    fetchStudentTasks,
    fetchNotifications,
    markAllNotificationsRead,
    joinWorkshop,
    clearSelectedReport,
    clearStudentState,
} from '../../../src/features/student/studentSlice';
import { configureStore } from '@reduxjs/toolkit';

describe('Student Slice', () => {
    let store;

    const initialState = {
        profile: null,
        upcomingReviews: [],
        nextExpectedReview: null,
        reviewHistory: [],
        selectedReport: null,
        progress: {
            stats: {
                overallProgress: 0,
                milestonesCompleted: 0,
                totalMilestones: 0,
                avgScore: 0,
            },
            weeklyProgress: [],
            milestones: [],
            improvementAreas: [],
        },
        tasks: [],
        workshops: [],
        syllabus: [],
        checklist: [],
        notifications: [],
        unreadCount: 0,
        loading: false,
        upcomingLoading: false,
        historyLoading: false,
        reportLoading: false,
        progressLoading: false,
        tasksLoading: false,
        workshopsLoading: false,
        uploadLoading: false,
        syllabusLoading: false,
        checklistLoading: false,
        notificationsLoading: false,
        error: null,
    };

    beforeEach(() => {
        store = configureStore({
            reducer: { student: studentReducer },
        });
    });

    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const state = store.getState().student;

            expect(state.upcomingReviews).toEqual([]);
            expect(state.reviewHistory).toEqual([]);
            expect(state.tasks).toEqual([]);
            expect(state.notifications).toEqual([]);
            expect(state.unreadCount).toBe(0);
            expect(state.error).toBeNull();
        });
    });

    describe('clearSelectedReport reducer', () => {
        it('should clear selected report', () => {
            const stateWithReport = {
                ...initialState,
                selectedReport: { id: '1', data: 'some data' },
            };

            const action = clearSelectedReport();
            const state = studentReducer(stateWithReport, action);

            expect(state.selectedReport).toBeNull();
        });
    });

    describe('clearStudentState reducer', () => {
        it('should reset student state to initial values', () => {
            const populatedState = {
                ...initialState,
                upcomingReviews: [{ id: '1' }],
                tasks: [{ id: 't1' }],
                workshops: [{ id: 'w1' }],
                reviewHistory: [{ id: 'h1' }],
            };

            const action = clearStudentState();
            const state = studentReducer(populatedState, action);

            expect(state.upcomingReviews).toEqual([]);
            expect(state.tasks).toEqual([]);
            expect(state.workshops).toEqual([]);
            expect(state.reviewHistory).toEqual([]);
        });
    });

    describe('fetchUpcomingReviews async thunk', () => {
        it('should set upcomingLoading to true when pending', () => {
            const action = { type: fetchUpcomingReviews.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.upcomingLoading).toBe(true);
        });

        it('should populate reviews when fulfilled', () => {
            const mockPayload = {
                upcomingReviews: [
                    { id: '1', status: 'scheduled' },
                    { id: '2', status: 'accepted' },
                ],
                nextExpectedReview: { date: '2025-01-15' },
            };

            const action = {
                type: fetchUpcomingReviews.fulfilled.type,
                payload: mockPayload,
            };
            const state = studentReducer(initialState, action);

            expect(state.upcomingLoading).toBe(false);
            expect(state.upcomingReviews).toHaveLength(2);
            expect(state.nextExpectedReview).toEqual({ date: '2025-01-15' });
        });

        it('should set error when rejected', () => {
            const action = {
                type: fetchUpcomingReviews.rejected.type,
                payload: 'Failed to fetch reviews',
            };
            const state = studentReducer(initialState, action);

            expect(state.upcomingLoading).toBe(false);
            expect(state.error).toBe('Failed to fetch reviews');
        });
    });

    describe('fetchReviewHistory async thunk', () => {
        it('should set historyLoading when pending', () => {
            const action = { type: fetchReviewHistory.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.historyLoading).toBe(true);
        });

        it('should populate history when fulfilled', () => {
            const mockHistory = [
                { id: '1', status: 'completed', score: 8.5 },
                { id: '2', status: 'scored', score: 9.0 },
            ];

            const action = {
                type: fetchReviewHistory.fulfilled.type,
                payload: mockHistory,
            };
            const state = studentReducer(initialState, action);

            expect(state.reviewHistory).toHaveLength(2);
            expect(state.reviewHistory[0].score).toBe(8.5);
        });
    });

    describe('fetchStudentProgress async thunk', () => {
        it('should set progressLoading when pending', () => {
            const action = { type: fetchStudentProgress.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.progressLoading).toBe(true);
        });

        it('should populate progress data when fulfilled', () => {
            const mockProgress = {
                stats: { overallProgress: 75, avgScore: 8.2 },
                weeklyProgress: [{ week: 1, score: 8 }],
                milestones: [],
                improvementAreas: [],
            };

            const action = {
                type: fetchStudentProgress.fulfilled.type,
                payload: mockProgress,
            };
            const state = studentReducer(initialState, action);

            expect(state.progressLoading).toBe(false);
            expect(state.progress).toEqual(mockProgress);
        });
    });

    describe('fetchStudentTasks async thunk', () => {
        it('should set tasksLoading when pending', () => {
            const action = { type: fetchStudentTasks.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.tasksLoading).toBe(true);
        });

        it('should populate tasks when fulfilled', () => {
            const mockTasks = [
                { id: 't1', title: 'Task 1', status: 'pending' },
                { id: 't2', title: 'Task 2', status: 'completed' },
            ];

            const action = {
                type: fetchStudentTasks.fulfilled.type,
                payload: mockTasks,
            };
            const state = studentReducer(initialState, action);

            expect(state.tasks).toHaveLength(2);
            expect(state.tasks[0].title).toBe('Task 1');
        });
    });

    describe('fetchNotifications async thunk', () => {
        it('should set notificationsLoading when pending', () => {
            const action = { type: fetchNotifications.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.notificationsLoading).toBe(true);
        });

        it('should populate notifications and unread count when fulfilled', () => {
            const mockPayload = {
                notifications: [
                    { id: 'n1', message: 'New review', isRead: false },
                    { id: 'n2', message: 'Task assigned', isRead: true },
                ],
                unreadCount: 1,
            };

            const action = {
                type: fetchNotifications.fulfilled.type,
                payload: mockPayload,
            };
            const state = studentReducer(initialState, action);

            expect(state.notifications).toHaveLength(2);
            expect(state.unreadCount).toBe(1);
        });
    });

    describe('markAllNotificationsRead async thunk', () => {
        it('should reset unread count and mark all as read when fulfilled', () => {
            const stateWithNotifications = {
                ...initialState,
                notifications: [
                    { id: 'n1', isRead: false },
                    { id: 'n2', isRead: false },
                ],
                unreadCount: 2,
            };

            const action = { type: markAllNotificationsRead.fulfilled.type };
            const state = studentReducer(stateWithNotifications, action);

            expect(state.unreadCount).toBe(0);
            state.notifications.forEach((n) => {
                expect(n.isRead).toBe(true);
            });
        });
    });

    describe('joinWorkshop async thunk', () => {
        it('should set loading when pending', () => {
            const action = { type: joinWorkshop.pending.type };
            const state = studentReducer(initialState, action);

            expect(state.loading).toBe(true);
        });

        it('should update workshop attendance when fulfilled', () => {
            const stateWithWorkshops = {
                ...initialState,
                workshops: [
                    { id: 'w1', title: 'Workshop 1', attendance: 'Not Attended' },
                    { id: 'w2', title: 'Workshop 2', attendance: 'Not Attended' },
                ],
            };

            const mockPayload = {
                workshopId: 'w1',
                workshop: { id: 'w1', title: 'Workshop 1', attendance: 'Attended' },
            };

            const action = {
                type: joinWorkshop.fulfilled.type,
                payload: mockPayload,
            };
            const state = studentReducer(stateWithWorkshops, action);

            const updatedWorkshop = state.workshops.find((w) => w.id === 'w1');
            expect(updatedWorkshop.attendance).toBe('Attended');
        });
    });

    describe('Error handling', () => {
        it('should clear error when new fetch starts', () => {
            const stateWithError = { ...initialState, error: 'Previous error' };

            const action = { type: fetchUpcomingReviews.pending.type };
            const state = studentReducer(stateWithError, action);

            expect(state.error).toBeNull();
            expect(state.upcomingLoading).toBe(true);
        });
    });
});
