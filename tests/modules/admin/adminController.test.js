/**
 * Admin Controller Tests
 * Simplified tests that match actual controller implementation
 */

describe('Admin Controller', () => {
    let mockReq;
    let mockRes;
    let adminController;
    let User;
    let Student;
    let ReviewSession;

    beforeEach(() => {
        // Reset all modules to ensure clean mocks
        jest.resetModules();
        jest.clearAllMocks();

        // Setup mocks BEFORE requiring the controller
        jest.doMock('../../src/modules/users/User', () => ({
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
        }));

        jest.doMock('../../src/modules/students/student', () => ({
            findById: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            countDocuments: jest.fn(),
            findByIdAndUpdate: jest.fn(),
            findByIdAndDelete: jest.fn(),
        }));

        jest.doMock('../../src/modules/reviews/reviewSession', () => ({
            find: jest.fn(),
            countDocuments: jest.fn(),
            aggregate: jest.fn(),
        }));

        jest.doMock('bcrypt', () => ({
            hash: jest.fn().mockResolvedValue('hashed-password'),
        }));

        jest.doMock('../../src/modules/auth/emailService', () => ({
            sendUserCredentials: jest.fn().mockResolvedValue(true),
        }));

        // Now require modules
        User = require('../../src/modules/users/User');
        Student = require('../../src/modules/students/student');
        ReviewSession = require('../../src/modules/reviews/reviewSession');
        adminController = require('../../src/modules/admin/adminController');

        mockReq = {
            body: {},
            params: {},
            query: {},
            user: { id: 'admin-123', role: 'admin' },
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('getMyProfile', () => {
        it('should return admin profile with message', async () => {
            const mockAdmin = {
                _id: 'admin-123',
                name: 'Admin User',
                email: 'admin@example.com',
                role: 'admin',
            };

            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(mockAdmin),
            });

            await adminController.getMyProfile(mockReq, mockRes);

            expect(User.findById).toHaveBeenCalledWith('admin-123');
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Admin profile fetched',
                admin: mockAdmin,
            });
        });

        it('should return 404 if admin not found', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            await adminController.getMyProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Admin not found' });
        });

        it('should return 500 on error', async () => {
            User.findById.mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error('DB Error')),
            });

            await adminController.getMyProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'Server error' });
        });
    });

    describe('getDashboardCounts', () => {
        it('should return all dashboard counts', async () => {
            Student.countDocuments.mockResolvedValue(50);
            User.countDocuments
                .mockResolvedValueOnce(3)  // reviewers
                .mockResolvedValueOnce(5); // advisors
            ReviewSession.countDocuments
                .mockResolvedValueOnce(100) // total
                .mockResolvedValueOnce(10)  // pending
                .mockResolvedValueOnce(5);  // today

            await adminController.getDashboardCounts(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                students: 50,
                reviewers: 3,
                advisors: 5,
                totalReviews: 100,
                pendingReviews: 10,
                reviewsToday: 5,
            });
        });

        it('should return 500 on error', async () => {
            Student.countDocuments.mockRejectedValue(new Error('DB Error'));

            await adminController.getDashboardCounts(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('createUser', () => {
        it('should return 400 if name is missing', async () => {
            mockReq.body = { email: 'test@test.com', role: 'advisor' };

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Name, email, and role are required',
            });
        });

        it('should return 400 if email is missing', async () => {
            mockReq.body = { name: 'Test', role: 'advisor' };

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 if role is missing', async () => {
            mockReq.body = { name: 'Test', email: 'test@test.com' };

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
        });

        it('should return 400 for invalid role', async () => {
            mockReq.body = { name: 'Test', email: 'test@test.com', role: 'superadmin' };

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid role. Must be: advisor, reviewer, or student',
            });
        });

        it('should return 400 if email already exists', async () => {
            mockReq.body = { name: 'Test', email: 'existing@test.com', role: 'advisor' };
            User.findOne.mockResolvedValue({ email: 'existing@test.com' });
            Student.findOne.mockResolvedValue(null);

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'A user with this email already exists',
            });
        });

        it('should return 400 if student created without advisorId', async () => {
            mockReq.body = { name: 'Test', email: 'new@test.com', role: 'student' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(null);

            await adminController.createUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Advisor ID is required for student creation',
            });
        });
    });

    describe('getUserById', () => {
        it('should return user by ID', async () => {
            mockReq.params = { id: 'user-123' };
            mockReq.query = {};
            const mockUser = { _id: 'user-123', name: 'Test', role: 'reviewer' };

            User.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(mockUser),
            });

            await adminController.getUserById(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                user: { ...mockUser, isStudent: false },
            });
        });

        it('should return student if type=student', async () => {
            mockReq.params = { id: 'student-123' };
            mockReq.query = { type: 'student' };
            const mockStudent = { _id: 'student-123', name: 'Student' };

            Student.findById.mockReturnValue({
                populate: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockStudent),
                }),
            });

            await adminController.getUserById(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                user: { ...mockStudent, role: 'student', isStudent: true },
            });
        });

        it('should return 404 if user not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            mockReq.query = {};

            User.findById.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            await adminController.getUserById(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({ message: 'User not found' });
        });
    });

    describe('updateUser', () => {
        it('should update user successfully', async () => {
            mockReq.params = { id: 'user-123' };
            mockReq.query = {};
            mockReq.body = { name: 'Updated Name' };

            const updatedUser = { _id: 'user-123', name: 'Updated Name' };

            User.findByIdAndUpdate.mockReturnValue({
                lean: jest.fn().mockResolvedValue(updatedUser),
            });

            await adminController.updateUser(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User updated successfully',
                user: updatedUser,
            });
        });

        it('should update student if type=student', async () => {
            mockReq.params = { id: 'student-123' };
            mockReq.query = { type: 'student' };
            mockReq.body = { name: 'Updated Student', batch: '2024' };

            const updatedStudent = { _id: 'student-123', name: 'Updated Student' };

            Student.findByIdAndUpdate.mockReturnValue({
                lean: jest.fn().mockResolvedValue(updatedStudent),
            });

            await adminController.updateUser(mockReq, mockRes);

            expect(Student.findByIdAndUpdate).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User updated successfully',
                user: { ...updatedStudent, role: 'student' },
            });
        });

        it('should return 404 if user not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            mockReq.query = {};
            mockReq.body = { name: 'Test' };

            User.findByIdAndUpdate.mockReturnValue({
                lean: jest.fn().mockResolvedValue(null),
            });

            await adminController.updateUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('toggleUserStatus', () => {
        it('should toggle active to inactive', async () => {
            mockReq.params = { id: 'user-123' };
            mockReq.query = {};

            const mockUser = {
                _id: 'user-123',
                status: 'active',
                save: jest.fn().mockResolvedValue(true),
            };

            User.findById.mockResolvedValue(mockUser);

            await adminController.toggleUserStatus(mockReq, mockRes);

            expect(mockUser.status).toBe('inactive');
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User deactivated successfully',
                status: 'inactive',
            });
        });

        it('should toggle inactive to active', async () => {
            mockReq.params = { id: 'user-123' };
            mockReq.query = {};

            const mockUser = {
                _id: 'user-123',
                status: 'inactive',
                save: jest.fn().mockResolvedValue(true),
            };

            User.findById.mockResolvedValue(mockUser);

            await adminController.toggleUserStatus(mockReq, mockRes);

            expect(mockUser.status).toBe('active');
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User activated successfully',
                status: 'active',
            });
        });

        it('should return 404 if user not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            mockReq.query = {};

            User.findById.mockResolvedValue(null);

            await adminController.toggleUserStatus(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('deleteUser', () => {
        it('should delete user successfully', async () => {
            mockReq.params = { id: 'user-123' };
            mockReq.query = {};

            User.findById.mockResolvedValue({ _id: 'user-123', role: 'reviewer' });
            User.findByIdAndDelete.mockResolvedValue({ _id: 'user-123' });

            await adminController.deleteUser(mockReq, mockRes);

            expect(User.findByIdAndDelete).toHaveBeenCalledWith('user-123');
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User deleted successfully',
            });
        });

        it('should return 403 when trying to delete admin', async () => {
            mockReq.params = { id: 'admin-id' };
            mockReq.query = {};

            User.findById.mockResolvedValue({ _id: 'admin-id', role: 'admin' });

            await adminController.deleteUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Cannot delete admin users',
            });
        });

        it('should delete student if type=student', async () => {
            mockReq.params = { id: 'student-123' };
            mockReq.query = { type: 'student' };

            Student.findByIdAndDelete.mockResolvedValue({ _id: 'student-123' });

            await adminController.deleteUser(mockReq, mockRes);

            expect(Student.findByIdAndDelete).toHaveBeenCalledWith('student-123');
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'User deleted successfully',
            });
        });

        it('should return 404 if user not found', async () => {
            mockReq.params = { id: 'nonexistent' };
            mockReq.query = {};

            User.findById.mockResolvedValue(null);

            await adminController.deleteUser(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });
});
