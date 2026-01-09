/**
 * Student Profile Controller Tests
 * Tests for: getProfile, changePassword, uploadAvatar, getDocuments, uploadDocument, deleteDocument
 */

describe('Student Profile Controller', () => {
    let mockReq;
    let mockRes;
    let studentProfileController;
    let Student;
    let bcrypt;

    beforeEach(() => {
        jest.resetModules();
        jest.clearAllMocks();

        jest.doMock('mongoose', () => ({
            Types: { ObjectId: function (id) { return id; } },
        }));

        jest.doMock('../../src/modules/students/student', () => ({
            findById: jest.fn(),
            findByIdAndUpdate: jest.fn(),
        }));

        jest.doMock('../../src/modules/reviews/reviewSession', () => ({
            find: jest.fn(),
            countDocuments: jest.fn(),
        }));

        jest.doMock('../../src/modules/tasks/Task', () => ({
            countDocuments: jest.fn(),
        }));

        jest.doMock('../../src/modules/users/User', () => ({
            findById: jest.fn(),
        }));

        jest.doMock('bcryptjs', () => ({
            compare: jest.fn(),
            hash: jest.fn(),
        }));

        Student = require('../../src/modules/students/student');
        bcrypt = require('bcryptjs');
        studentProfileController = require('../../src/modules/students/studentProfileController');

        mockReq = {
            body: {},
            params: {},
            user: { id: 'student-123', role: 'student' },
            file: null,
        };

        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    describe('getProfile', () => {
        it('should return student profile', async () => {
            const mockStudent = {
                _id: 'student-123',
                name: 'Test Student',
                email: 'student@test.com',
                phone: '1234567890',
                batch: '2024',
                course: 'CS',
                domain: 'Web Dev',
                avatar: '/uploads/avatar.jpg',
                createdAt: new Date(),
            };

            Student.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockStudent),
                }),
            });

            await studentProfileController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                profile: expect.objectContaining({
                    id: 'student-123',
                    name: 'Test Student',
                }),
            });
        });

        it('should return 404 if student not found', async () => {
            Student.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null),
                }),
            });

            await studentProfileController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Student not found',
            });
        });

        it('should return 500 on error', async () => {
            Student.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockRejectedValue(new Error('DB Error')),
                }),
            });

            await studentProfileController.getProfile(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(500);
        });
    });

    describe('changePassword', () => {
        it('should return 400 if fields are missing', async () => {
            mockReq.body = { currentPassword: 'pass' };

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'All fields are required',
            });
        });

        it('should return 400 if new password is too short', async () => {
            mockReq.body = {
                currentPassword: 'currentPass',
                newPassword: 'short',
                confirmPassword: 'short',
            };

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Password must be at least 8 characters',
            });
        });

        it('should return 400 if passwords do not match', async () => {
            mockReq.body = {
                currentPassword: 'currentPass',
                newPassword: 'newPassword123',
                confirmPassword: 'differentPassword',
            };

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'New passwords do not match',
            });
        });

        it('should return 404 if student not found', async () => {
            mockReq.body = {
                currentPassword: 'currentPass',
                newPassword: 'newPassword123',
                confirmPassword: 'newPassword123',
            };
            Student.findById.mockResolvedValue(null);

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });

        it('should return 400 if current password is incorrect', async () => {
            mockReq.body = {
                currentPassword: 'wrongPass',
                newPassword: 'newPassword123',
                confirmPassword: 'newPassword123',
            };
            Student.findById.mockResolvedValue({
                _id: 'student-123',
                passwordHash: 'hashed-password',
            });
            bcrypt.compare.mockResolvedValue(false);

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Current password is incorrect',
            });
        });

        it('should successfully change password', async () => {
            mockReq.body = {
                currentPassword: 'correctPass',
                newPassword: 'newPassword123',
                confirmPassword: 'newPassword123',
            };
            const mockStudent = {
                _id: 'student-123',
                passwordHash: 'old-hash',
                save: jest.fn().mockResolvedValue(true),
            };
            Student.findById.mockResolvedValue(mockStudent);
            bcrypt.compare.mockResolvedValue(true);
            bcrypt.hash.mockResolvedValue('new-hash');

            await studentProfileController.changePassword(mockReq, mockRes);

            expect(mockStudent.save).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Password updated successfully',
            });
        });
    });

    describe('uploadAvatar', () => {
        it('should return 400 if no file uploaded', async () => {
            mockReq.file = null;

            await studentProfileController.uploadAvatar(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No file uploaded',
            });
        });

        it('should successfully upload avatar', async () => {
            mockReq.file = { filename: 'avatar-123.jpg' };
            Student.findByIdAndUpdate.mockResolvedValue({ _id: 'student-123' });

            await studentProfileController.uploadAvatar(mockReq, mockRes);

            expect(Student.findByIdAndUpdate).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Profile picture updated',
                avatar: '/uploads/avatars/avatar-123.jpg',
            });
        });
    });

    describe('getDocuments', () => {
        it('should return student documents', async () => {
            const mockStudent = {
                _id: 'student-123',
                documents: [
                    { filename: 'doc1.pdf', uploadedAt: new Date() },
                    { filename: 'doc2.pdf', uploadedAt: new Date() },
                ],
            };

            Student.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(mockStudent),
                }),
            });

            await studentProfileController.getDocuments(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                documents: mockStudent.documents,
            });
        });

        it('should return 404 if student not found', async () => {
            Student.findById.mockReturnValue({
                select: jest.fn().mockReturnValue({
                    lean: jest.fn().mockResolvedValue(null),
                }),
            });

            await studentProfileController.getDocuments(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(404);
        });
    });

    describe('uploadDocument', () => {
        it('should return 400 if no file uploaded', async () => {
            mockReq.file = null;

            await studentProfileController.uploadDocument(mockReq, mockRes);

            expect(mockRes.status).toHaveBeenCalledWith(400);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'No file uploaded',
            });
        });

        it('should successfully upload document', async () => {
            mockReq.file = {
                filename: 'document-123.pdf',
                originalname: 'MyDocument.pdf',
                mimetype: 'application/pdf',
                size: 1024,
            };
            Student.findByIdAndUpdate.mockResolvedValue({ _id: 'student-123' });

            await studentProfileController.uploadDocument(mockReq, mockRes);

            expect(Student.findByIdAndUpdate).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Document uploaded',
                document: expect.objectContaining({
                    filename: 'MyDocument.pdf',
                }),
            });
        });
    });

    describe('deleteDocument', () => {
        it('should successfully delete document', async () => {
            mockReq.params = { documentId: 'doc-123' };
            Student.findByIdAndUpdate.mockResolvedValue({ _id: 'student-123' });

            await studentProfileController.deleteDocument(mockReq, mockRes);

            expect(Student.findByIdAndUpdate).toHaveBeenCalled();
            expect(mockRes.status).toHaveBeenCalledWith(200);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Document deleted',
            });
        });
    });
});
