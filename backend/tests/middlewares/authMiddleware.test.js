/**
 * Auth Middleware Tests
 * Tests for JWT token validation and role-based access control
 */

const authMiddleware = require("../../src/middlewares/authMiddleware");
const jwt = require('jsonwebtoken');

// Test environment setup
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';

describe('Auth Middleware', () => {
    let mockReq;
    let mockRes;
    let mockNext;

    beforeEach(() => {
        mockReq = {
            headers: {},
        };
        mockRes = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        mockNext = jest.fn();
    });

    /**
     * Helper to generate valid JWT token
     */
    const generateToken = (payload, options = {}) => {
        return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
            expiresIn: '1h',
            ...options,
        });
    };

    describe('Token Validation', () => {
        it('should reject request with missing Authorization header', () => {
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Authorization token missing or malformed',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should reject request with malformed Authorization header (no Bearer)', () => {
            mockReq.headers.authorization = 'InvalidToken123';
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Authorization token missing or malformed',
            });
        });

        it('should reject request with only "Bearer" (no token)', () => {
            mockReq.headers.authorization = 'Bearer ';
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            // Should still attempt to verify empty string, which will fail
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });

        it('should reject request with invalid/corrupted token', () => {
            mockReq.headers.authorization = 'Bearer invalid.token.here';
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token',
            });
        });

        it('should reject request with expired token', () => {
            const expiredToken = jwt.sign(
                { id: 'user-123', role: 'admin' },
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '-1s' }
            );
            mockReq.headers.authorization = `Bearer ${expiredToken}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token',
            });
        });

        it('should reject token signed with wrong secret', () => {
            const wrongSecretToken = jwt.sign(
                { id: 'user-123', role: 'admin' },
                'wrong-secret-key'
            );
            mockReq.headers.authorization = `Bearer ${wrongSecretToken}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(401);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Invalid or expired token',
            });
        });

        it('should accept valid token and attach user to request', () => {
            const payload = { id: 'user-123', role: 'admin' };
            const token = generateToken(payload);
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user).toBeDefined();
            expect(mockReq.user.id).toBe('user-123');
            expect(mockReq.user.role).toBe('admin');
        });
    });

    describe('Role-Based Access Control - Single Role', () => {
        it('should allow access when user role matches required role', () => {
            const token = generateToken({ id: 'user-123', role: 'admin' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware('admin');

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockRes.status).not.toHaveBeenCalled();
        });

        it('should deny access when user role does not match required role', () => {
            const token = generateToken({ id: 'user-123', role: 'student' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware('admin');

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Access denied: admin only',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow access when no role is required (null)', () => {
            const token = generateToken({ id: 'user-123', role: 'student' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware(null);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should allow access when no role is required (no argument)', () => {
            const token = generateToken({ id: 'user-123', role: 'reviewer' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Role-Based Access Control - Array of Roles', () => {
        it('should allow access when user role is in the allowed roles array', () => {
            const token = generateToken({ id: 'user-123', role: 'reviewer' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware(['admin', 'advisor', 'reviewer']);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should deny access when user role is not in the allowed roles array', () => {
            const token = generateToken({ id: 'user-123', role: 'student' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware(['admin', 'advisor']);

            middleware(mockReq, mockRes, mockNext);

            expect(mockRes.status).toHaveBeenCalledWith(403);
            expect(mockRes.json).toHaveBeenCalledWith({
                message: 'Access denied: requires one of [admin, advisor]',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should work with single-element array', () => {
            const token = generateToken({ id: 'user-123', role: 'admin' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware(['admin']);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });

        it('should work with all four roles', () => {
            const token = generateToken({ id: 'user-123', role: 'student' });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware(['admin', 'advisor', 'reviewer', 'student']);

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
        });
    });

    describe('Edge Cases', () => {
        it('should handle token with extra payload fields', () => {
            const token = generateToken({
                id: 'user-123',
                role: 'admin',
                email: 'test@example.com',
                customField: 'value',
            });
            mockReq.headers.authorization = `Bearer ${token}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            expect(mockNext).toHaveBeenCalled();
            expect(mockReq.user.email).toBe('test@example.com');
            expect(mockReq.user.customField).toBe('value');
        });

        it('should handle lowercase bearer prefix', () => {
            const token = generateToken({ id: 'user-123', role: 'admin' });
            mockReq.headers.authorization = `bearer ${token}`;
            const middleware = authMiddleware();

            middleware(mockReq, mockRes, mockNext);

            // Should fail because it checks for "Bearer " specifically
            expect(mockRes.status).toHaveBeenCalledWith(401);
        });
    });
});
