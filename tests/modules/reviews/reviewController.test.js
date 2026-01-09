/**
 * Review Controller Tests
 * Simplified tests matching actual controller implementation patterns
 */

describe('Review Controller', () => {
    let mockReq;
    let mockRes;
    let reviewController;
    let ReviewSession;
    let Student;
    let User;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        // Mock all dependencies
        jest.doMock('../../src/modules/reviews/reviewSession', () => {
            const MockSession = function (data) {
                return { ...data, save: jest.fn().mockResolvedValue({ _id: 'new-id', ...data }) };
            };
            MockSession.find = jest.fn();
            MockSession.findOne = jest.fn();
            MockSession.findById = jest.fn();
            MockSession.create = jest.fn();
            return MockSession;
        });

        jest.doMock('../../src/modules/reviews/ReviewerEvaluation', () => {
            return function (data) {
                return { ...data, save: jest.fn().mockResolvedValue(data) };
            };
        });

        jest.doMock('../../src/modules/reviews/FinalEvaluation', () => {
            return function (data) {
                return { ...data, save: jest.fn().mockResolvedValue(data) };
            };
        });

        jest.doMock('../../src/modules/students/student', () => ({
            findById: jest.fn(),
            find: jest.fn(),
        }));

        jest.doMock('../../src/modules/users/User', () => ({
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
        }));

        jest.doMock('../../src/modules/notifications/Notification', () => ({
            create: jest.fn().mockResolvedValue({}),
        }));

        jest.doMock('../../src/modules/auth/emailService', () => ({
            sendReviewAssignmentEmail: jest.fn().mockResolvedValue(true),
        }));

        jest.doMock('mongoose', () => ({
            Types: {
                ObjectId: function (id) { return id; },
            },
        }));

        // Now require modules
        ReviewSession = require('../../src/modules/reviews/reviewSession');
        Student = require('../../src/modules/students/student');
        User = require('../../src/modules/users/User');
        reviewController = require('../../src/modules/reviews/reviewController');

        mockReq = {
            body: {},
            params: {},
            query: {},
            user: { id: 'advisor-123', role: 'advisor' },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('createReview', () => {
        it('should return 400 if required fields are missing', async () => {
            mockReq.body = { studentId: 'some-id' };

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Missing required fields',
            });
        });

        it('should return 400 if mode is invalid', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date().toISOString(),
                mode: 'hybrid', // Invalid
            };

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid review mode',
            });
        });

        it('should return 404 if student is not found', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date().toISOString(),
                mode: 'online',
            };
            Student.findById.mockResolvedValue(null);

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Student not found',
            });
        });

        it('should return 403 if advisor does not own the student', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date().toISOString(),
                mode: 'online',
            };
            Student.findById.mockResolvedValue({
                _id: 'student-id',
                advisorId: { toString: () => 'different-advisor' },
            });

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: "You are not assigned as this student's advisor",
            });
        });

        it('should return 404 if reviewer is not found', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date().toISOString(),
                mode: 'online',
            };
            Student.findById.mockResolvedValue({
                _id: 'student-id',
                advisorId: { toString: () => 'advisor-123' },
            });
            User.findOne.mockResolvedValue(null);

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Reviewer not found',
            });
        });

        it('should successfully create a review session', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date(Date.now() + 86400000).toISOString(),
                mode: 'online',
                meetingLink: 'https://meet.google.com/abc',
            };

            Student.findById.mockResolvedValue({
                _id: 'student-id',
                name: 'Test Student',
                email: 'student@test.com',
                advisorId: { toString: () => 'advisor-123' },
            });
            User.findOne.mockResolvedValue({
                _id: 'reviewer-id',
                name: 'Test Reviewer',
                email: 'reviewer@test.com',
                role: 'reviewer',
            });
            User.findById.mockResolvedValue({
                _id: 'advisor-123',
                name: 'Advisor Name',
            });
            ReviewSession.create.mockResolvedValue({ _id: 'new-review-id' });

            await reviewController.createReview(mockReq, mockRes);

            expect(ReviewSession.create).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(201);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review scheduled successfully',
                review: { _id: 'new-review-id' },
            });
        });

        it('should handle database errors', async () => {
            mockReq.body = {
                studentId: 'student-id',
                reviewerId: 'reviewer-id',
                week: 1,
                scheduledAt: new Date().toISOString(),
                mode: 'online',
            };
            Student.findById.mockRejectedValue(new Error('Database error'));

            await reviewController.createReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Failed to create review',
            });
        });
    });

    describe('acceptReviewByReviewer', () => {
        beforeEach(() => {
            mockReq.user = { id: 'reviewer-123', role: 'reviewer' };
            mockReq.params = { reviewId: 'review-123' };
        });

        it('should return 404 if review is not found', async () => {
            ReviewSession.findOne.mockResolvedValue(null);

            await reviewController.acceptReviewByReviewer(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review not found',
            });
        });

        it('should return 400 if review status is not pending', async () => {
            ReviewSession.findOne.mockResolvedValue({
                _id: 'review-123',
                status: 'accepted',
            });

            await reviewController.acceptReviewByReviewer(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should successfully accept a pending review', async () => {
            const mockReview = {
                _id: 'review-123',
                status: 'pending',
                save: jest.fn().mockResolvedValue(true),
            };
            ReviewSession.findOne.mockResolvedValue(mockReview);

            await reviewController.acceptReviewByReviewer(mockReq, mockRes);

            expect(mockReview.status).toBe('accepted');
            expect(mockReview.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review accepted successfully',
                reviewId: 'review-123',
                status: 'accepted',
            });
        });
    });

    describe('rejectReviewByReviewer', () => {
        beforeEach(() => {
            mockReq.user = { id: 'reviewer-123', role: 'reviewer' };
            mockReq.params = { reviewId: 'review-123' };
        });

        it('should return 404 if review is not found', async () => {
            ReviewSession.findOne.mockResolvedValue(null);

            await reviewController.rejectReviewByReviewer(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if status is not pending', async () => {
            ReviewSession.findOne.mockResolvedValue({
                _id: 'review-123',
                status: 'completed',
            });

            await reviewController.rejectReviewByReviewer(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should successfully reject a pending review', async () => {
            mockReq.body = { reason: 'Schedule conflict' };

            const mockReview = {
                _id: 'review-123',
                status: 'pending',
                save: jest.fn().mockResolvedValue(true),
            };
            ReviewSession.findOne.mockResolvedValue(mockReview);

            await reviewController.rejectReviewByReviewer(mockReq, mockRes);

            expect(mockReview.status).toBe('rejected');
            expect(mockReview.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });
    });

    describe('rescheduleReview', () => {
        beforeEach(() => {
            mockReq.user = { id: 'advisor-123', role: 'advisor' };
            mockReq.params = { reviewId: 'review-123' };
        });

        it('should return 400 if scheduledAt is missing', async () => {
            mockReq.body = {};

            await reviewController.rescheduleReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'New date/time is required',
            });
        });

        it('should return 404 if review is not found', async () => {
            mockReq.body = { scheduledAt: new Date().toISOString() };
            ReviewSession.findOne.mockResolvedValue(null);

            await reviewController.rescheduleReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review not found',
            });
        });

        it('should return 400 if review is already completed', async () => {
            mockReq.body = { scheduledAt: new Date().toISOString() };
            ReviewSession.findOne.mockResolvedValue({
                _id: 'review-123',
                status: 'completed',
            });

            await reviewController.rescheduleReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should successfully reschedule a review', async () => {
            const newDate = new Date(Date.now() + 172800000).toISOString();
            mockReq.body = { scheduledAt: newDate };

            const mockReview = {
                _id: 'review-123',
                status: 'scheduled',
                save: jest.fn().mockResolvedValue(true),
                populate: jest.fn().mockResolvedValue(true),
                reviewer: { name: 'Test', email: 'test@test.com' },
            };
            ReviewSession.findOne.mockResolvedValue(mockReview);

            await reviewController.rescheduleReview(mockReq, mockRes);

            expect(mockReview.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Review rescheduled successfully',
                })
            );
        });
    });

    describe('cancelReview', () => {
        beforeEach(() => {
            mockReq.user = { id: 'advisor-123', role: 'advisor' };
            mockReq.params = { reviewId: 'review-123' };
        });

        it('should return 400 if reason is missing', async () => {
            mockReq.body = {};

            await reviewController.cancelReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cancellation reason is required',
            });
        });

        it('should return 404 if review is not found', async () => {
            mockReq.body = { reason: 'Test reason' };
            ReviewSession.findOne.mockResolvedValue(null);

            await reviewController.cancelReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if trying to cancel a completed review', async () => {
            mockReq.body = { reason: 'Test reason' };
            ReviewSession.findOne.mockResolvedValue({
                _id: 'review-123',
                status: 'completed',
            });

            await reviewController.cancelReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cannot cancel a completed review',
            });
        });

        it('should return 400 if review is already cancelled', async () => {
            mockReq.body = { reason: 'Test reason' };
            ReviewSession.findOne.mockResolvedValue({
                _id: 'review-123',
                status: 'cancelled',
            });

            await reviewController.cancelReview(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review is already cancelled',
            });
        });

        it('should successfully cancel a scheduled review', async () => {
            mockReq.body = { reason: 'Student unavailable' };

            const mockReview = {
                _id: 'review-123',
                status: 'scheduled',
                save: jest.fn().mockResolvedValue(true),
            };
            ReviewSession.findOne.mockResolvedValue(mockReview);

            await reviewController.cancelReview(mockReq, mockRes);

            expect(mockReview.status).toBe('cancelled');
            expect(mockReview.feedback).toBe('Cancelled: Student unavailable');
            expect(mockReview.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Review cancelled successfully',
                reviewId: 'review-123',
            });
        });
    });
});
