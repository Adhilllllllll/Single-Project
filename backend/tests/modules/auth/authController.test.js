/**
 * Auth Controller Tests
 * Tests for: login, forgotPassword, resetPassword
 */

const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Mock all dependencies before requiring the controller
jest.mock('../../src/utils/jwt', () => ({
    signAccessToken: jest.fn(() => 'mock-access-token'),
}));

jest.mock('../../src/modules/auth/emailService', () => ({
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
}));

jest.mock('../../src/modules/users/User', () => ({
    findOne: jest.fn(),
}));

jest.mock('../../src/modules/students/student', () => ({
    findOne: jest.fn(),
}));

const authController = require('../../src/modules/auth/authController');
const User = require('../../src/modules/users/User');
const Student = require('../../src/modules/students/student');
const { signAccessToken } = require('../../src/utils/jwt');
const { sendPasswordResetEmail } = require('../../src/modules/auth/emailService');

describe('Auth Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        jest.clearAllMocks();

        mockReq = {
            body: {},
            method: 'POST',
            originalUrl: '/api/auth/login',
            headers: {},
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('login', () => {
        const validPasswordHash = bcrypt.hashSync('password123', 10);

        const mockUserData = {
            _id: 'user-123',
            name: 'Test User',
            email: 'test@example.com',
            role: 'admin',
            status: 'active',
            passwordHash: validPasswordHash,
            mustChangePassword: false,
        };

        it('should return 400 if email is missing', async () => {
            mockReq.body = { password: 'password123' };

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Email and password are required',
            });
        });

        it('should return 400 if password is missing', async () => {
            mockReq.body = { email: 'test@example.com' };

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Email and password are required',
            });
        });

        it('should return 400 if both email and password are missing', async () => {
            mockReq.body = {};

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Email and password are required',
            });
        });

        it('should return 400 if user not found in both collections', async () => {
            mockReq.body = { email: 'notfound@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(null);

            await authController.login(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'notfound@example.com' });
            expect(Student.findOne).toHaveBeenCalledWith({ email: 'notfound@example.com' });
            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid credentials',
            });
        });

        it('should return 403 if user account is inactive', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue({
                ...mockUserData,
                status: 'inactive',
            });

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Account disabled',
            });
        });

        it('should return 400 if password is incorrect', async () => {
            mockReq.body = { email: 'test@example.com', password: 'wrongpassword' };
            User.findOne.mockResolvedValue(mockUserData);

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid credentials',
            });
        });

        it('should successfully login admin/advisor/reviewer user', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(mockUserData);

            await authController.login(mockReq, mockRes);

            expect(signAccessToken).toHaveBeenCalledWith({
                id: 'user-123',
                role: 'admin',
                accountType: 'user',
            });
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                accessToken: 'mock-access-token',
                mustChangePassword: false,
                user: {
                    id: 'user-123',
                    name: 'Test User',
                    email: 'test@example.com',
                    role: 'admin',
                },
            });
        });

        it('should successfully login student user', async () => {
            const mockStudent = {
                _id: 'student-123',
                name: 'Test Student',
                email: 'student@example.com',
                status: 'active',
                passwordHash: validPasswordHash,
                mustChangePassword: false,
            };

            mockReq.body = { email: 'student@example.com', password: 'password123' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(mockStudent);

            await authController.login(mockReq, mockRes);

            expect(signAccessToken).toHaveBeenCalledWith({
                id: 'student-123',
                role: 'student',
                accountType: 'student',
            });
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should include mustChangePassword flag when true', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockResolvedValue({
                ...mockUserData,
                mustChangePassword: true,
            });

            await authController.login(mockReq, mockRes);

            expect(mockRes.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    mustChangePassword: true,
                })
            );
        });

        it('should normalize email to lowercase', async () => {
            mockReq.body = { email: '  TEST@EXAMPLE.COM  ', password: 'password123' };
            User.findOne.mockResolvedValue(mockUserData);

            await authController.login(mockReq, mockRes);

            expect(User.findOne).toHaveBeenCalledWith({ email: 'test@example.com' });
        });

        it('should return 500 on database error', async () => {
            mockReq.body = { email: 'test@example.com', password: 'password123' };
            User.findOne.mockRejectedValue(new Error('Database connection failed'));

            await authController.login(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Server error',
            });
        });
    });

    describe('forgotPassword', () => {
        it('should return 400 if email is missing', async () => {
            mockReq.body = {};

            await authController.forgotPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Email is required',
            });
        });

        it('should return 200 even if email is not found (security)', async () => {
            mockReq.body = { email: 'notfound@example.com' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(null);

            await authController.forgotPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'If an account with that email exists, a reset link has been sent.',
            });
            // Email service should NOT be called
            expect(sendPasswordResetEmail).not.toHaveBeenCalled();
        });

        it('should generate reset token and send email for User', async () => {
            const mockUser = {
                _id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                save: jest.fn().mockResolvedValue(true),
            };

            mockReq.body = { email: 'test@example.com' };
            User.findOne.mockResolvedValue(mockUser);

            await authController.forgotPassword(mockReq, mockRes);

            expect(mockUser.resetPasswordToken).toBeDefined();
            expect(mockUser.resetPasswordExpires).toBeDefined();
            expect(mockUser.save).toHaveBeenCalled();
            expect(sendPasswordResetEmail).toHaveBeenCalledWith(
                'test@example.com',
                'Test User',
                expect.any(String)
            );
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should generate reset token and send email for Student', async () => {
            const mockStudent = {
                _id: 'student-123',
                email: 'student@example.com',
                name: 'Test Student',
                save: jest.fn().mockResolvedValue(true),
            };

            mockReq.body = { email: 'student@example.com' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(mockStudent);

            await authController.forgotPassword(mockReq, mockRes);

            expect(mockStudent.save).toHaveBeenCalled();
            expect(sendPasswordResetEmail).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should still return success if email sending fails', async () => {
            const mockUser = {
                _id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                save: jest.fn().mockResolvedValue(true),
            };

            mockReq.body = { email: 'test@example.com' };
            User.findOne.mockResolvedValue(mockUser);
            sendPasswordResetEmail.mockRejectedValue(new Error('SMTP failed'));

            await authController.forgotPassword(mockReq, mockRes);

            // Should still return success to not reveal email existence
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 500 on database error', async () => {
            mockReq.body = { email: 'test@example.com' };
            User.findOne.mockRejectedValue(new Error('Database error'));

            await authController.forgotPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Server error',
            });
        });
    });

    describe('resetPassword', () => {
        it('should return 400 if token is missing', async () => {
            mockReq.body = { newPassword: 'newPassword123' };

            await authController.resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Token and new password are required',
            });
        });

        it('should return 400 if newPassword is missing', async () => {
            mockReq.body = { token: 'some-reset-token' };

            await authController.resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Token and new password are required',
            });
        });

        it('should return 400 if password is less than 8 characters', async () => {
            mockReq.body = { token: 'some-reset-token', newPassword: 'short' };

            await authController.resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Password must be at least 8 characters',
            });
        });

        it('should return 400 if token is invalid or expired', async () => {
            mockReq.body = { token: 'invalid-token', newPassword: 'newPassword123' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(null);

            await authController.resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid or expired reset token',
            });
        });

        it('should successfully reset password for User', async () => {
            const resetToken = 'valid-reset-token';
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            const mockUser = {
                _id: 'user-123',
                resetPasswordToken: tokenHash,
                resetPasswordExpires: new Date(Date.now() + 3600000),
                save: jest.fn().mockResolvedValue(true),
            };

            mockReq.body = { token: resetToken, newPassword: 'newPassword123' };
            User.findOne.mockResolvedValue(mockUser);

            await authController.resetPassword(mockReq, mockRes);

            expect(mockUser.passwordHash).toBeDefined();
            expect(mockUser.resetPasswordToken).toBeUndefined();
            expect(mockUser.resetPasswordExpires).toBeUndefined();
            expect(mockUser.mustChangePassword).toBe(false);
            expect(mockUser.passwordChangedAt).toBeDefined();
            expect(mockUser.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Password reset successful. Please login with your new password.',
            });
        });

        it('should successfully reset password for Student', async () => {
            const resetToken = 'valid-reset-token';
            const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

            const mockStudent = {
                _id: 'student-123',
                resetPasswordToken: tokenHash,
                resetPasswordExpires: new Date(Date.now() + 3600000),
                save: jest.fn().mockResolvedValue(true),
            };

            mockReq.body = { token: resetToken, newPassword: 'newPassword123' };
            User.findOne.mockResolvedValue(null);
            Student.findOne.mockResolvedValue(mockStudent);

            await authController.resetPassword(mockReq, mockRes);

            expect(mockStudent.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
        });

        it('should return 500 on database error', async () => {
            mockReq.body = { token: 'some-token', newPassword: 'newPassword123' };
            User.findOne.mockRejectedValue(new Error('Database error'));

            await authController.resetPassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Server error',
            });
        });
    });
});
