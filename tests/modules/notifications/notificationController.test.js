/**
 * Notification Controller Tests
 * Tests for: getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount
 */

describe('Notification Controller', () => {
    let mockReq;
    let mockRes;
    let notificationController;
    let Notification;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        jest.doMock('mongoose', () => ({
            Types: { ObjectId: function (id) { return id; } },
        }));

        jest.doMock('../../src/modules/notifications/Notification', () => ({
            find: jest.fn(),
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            findOneAndDelete: jest.fn(),
            updateMany: jest.fn(),
            countDocuments: jest.fn(),
            insertMany: jest.fn(),
        }));

        jest.doMock('../../src/modules/users/User', () => ({
            find: jest.fn(),
        }));

        jest.doMock('../../src/modules/students/student', () => ({
            find: jest.fn(),
        }));

        Notification = require('../../src/modules/notifications/Notification');
        notificationController = require('../../src/modules/notifications/notificationController');

        mockReq = {
            body: {},
            params: {},
            query: {},
            user: { id: 'user-123', role: 'student' },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('getNotifications', () => {
        it('should return formatted notifications with unread count', async () => {
            const mockNotifications = [
                { _id: 'n1', type: 'review', title: 'Review', message: 'Test 1', isRead: false, createdAt: new Date() },
                { _id: 'n2', type: 'task', title: 'Task', message: 'Test 2', isRead: true, createdAt: new Date() },
            ];

            Notification.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        lean: jest.fn().mockResolvedValue(mockNotifications),
                    }),
                }),
            });

            await notificationController.getNotifications(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                notifications: expect.arrayContaining([
                    expect.objectContaining({ id: 'n1' }),
                ]),
                unreadCount: 1,
            });
        });

        it('should handle errors', async () => {
            Notification.find.mockReturnValue({
                sort: jest.fn().mockReturnValue({
                    limit: jest.fn().mockReturnValue({
                        lean: jest.fn().mockRejectedValue(new Error('DB Error')),
                    }),
                }),
            });

            await notificationController.getNotifications(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Failed to fetch notifications',
            });
        });
    });

    describe('markAsRead', () => {
        it('should return 404 if notification not found', async () => {
            mockReq.params = { notificationId: 'nonexistent' };
            Notification.findOneAndUpdate.mockResolvedValue(null);

            await notificationController.markAsRead(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Notification not found',
            });
        });

        it('should mark notification as read', async () => {
            mockReq.params = { notificationId: 'n-123' };
            const mockNotification = {
                _id: 'n-123',
                isRead: true,
            };
            Notification.findOneAndUpdate.mockResolvedValue(mockNotification);

            await notificationController.markAsRead(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Marked as read',
                notification: {
                    id: 'n-123',
                    isRead: true,
                },
            });
        });
    });

    describe('markAllAsRead', () => {
        it('should mark all notifications as read', async () => {
            Notification.updateMany.mockResolvedValue({ modifiedCount: 5 });

            await notificationController.markAllAsRead(mockReq, mockRes);

            expect(Notification.updateMany).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'All notifications marked as read',
            });
        });

        it('should handle errors', async () => {
            Notification.updateMany.mockRejectedValue(new Error('DB Error'));

            await notificationController.markAllAsRead(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('deleteNotification', () => {
        it('should return 404 if notification not found', async () => {
            mockReq.params = { notificationId: 'nonexistent' };
            Notification.findOneAndDelete.mockResolvedValue(null);

            await notificationController.deleteNotification(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Notification not found',
            });
        });

        it('should delete notification', async () => {
            mockReq.params = { notificationId: 'n-123' };
            Notification.findOneAndDelete.mockResolvedValue({ _id: 'n-123' });

            await notificationController.deleteNotification(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Notification deleted',
            });
        });
    });

    describe('getUnreadCount', () => {
        it('should return unread notification count', async () => {
            Notification.countDocuments.mockResolvedValue(7);

            await notificationController.getUnreadCount(mockReq, mockRes);

            expect(Notification.countDocuments).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({ unreadCount: 7 });
        });

        it('should return 0 if no unread notifications', async () => {
            Notification.countDocuments.mockResolvedValue(0);

            await notificationController.getUnreadCount(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({ unreadCount: 0 });
        });

        it('should handle errors', async () => {
            Notification.countDocuments.mockRejectedValue(new Error('DB Error'));

            await notificationController.getUnreadCount(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });
});
