/**
 * JWT Utility Tests
 * Tests for: signAccessToken, verifyAccessToken, signRefreshToken,
 *            verifyRefreshToken, hashToken, generateRandomToken
 */

const jwt = require('jsonwebtoken');

// Set up environment variables before importing jwt utils
process.env.JWT_ACCESS_SECRET = 'test-access-secret-key';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key';
process.env.ACCESS_TOKEN_EXPIRES = '15m';
process.env.REFRESH_TOKEN_EXPIRES = '7d';

const {
    signAccessToken,
    signRefreshToken,
    verifyAccessToken,
    verifyRefreshToken,
    hashToken,
    generateRandomToken,
} = require('../../src/utils/jwt');

describe('JWT Utility Functions', () => {
    const testPayload = { id: 'user-123', role: 'admin' };

    describe('signAccessToken', () => {
        it('should generate a valid JWT access token', () => {
            const token = signAccessToken(testPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3); // JWT format: header.payload.signature
        });

        it('should include payload data in the token', () => {
            const token = signAccessToken(testPayload);
            const decoded = jwt.decode(token);

            expect(decoded.id).toBe(testPayload.id);
            expect(decoded.role).toBe(testPayload.role);
        });

        it('should throw error when payload is null', () => {
            expect(() => signAccessToken(null)).toThrow('Payload required');
        });

        it('should throw error when payload is undefined', () => {
            expect(() => signAccessToken(undefined)).toThrow('Payload required');
        });
    });

    describe('signRefreshToken', () => {
        it('should generate a valid JWT refresh token', () => {
            const token = signRefreshToken(testPayload);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should include payload data in the token', () => {
            const token = signRefreshToken(testPayload);
            const decoded = jwt.decode(token);

            expect(decoded.id).toBe(testPayload.id);
            expect(decoded.role).toBe(testPayload.role);
        });

        it('should throw error when payload is null', () => {
            expect(() => signRefreshToken(null)).toThrow('Payload required');
        });
    });

    describe('verifyAccessToken', () => {
        it('should return decoded payload for valid token', () => {
            const token = signAccessToken(testPayload);
            const decoded = verifyAccessToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe(testPayload.id);
            expect(decoded.role).toBe(testPayload.role);
        });

        it('should return null for invalid token', () => {
            const result = verifyAccessToken('invalid.token.here');

            expect(result).toBeNull();
        });

        it('should return null for expired token', () => {
            // Create a token that expires immediately
            const expiredToken = jwt.sign(
                testPayload,
                process.env.JWT_ACCESS_SECRET,
                { expiresIn: '-1s' }
            );

            const result = verifyAccessToken(expiredToken);
            expect(result).toBeNull();
        });

        it('should return null for token with wrong secret', () => {
            const wrongSecretToken = jwt.sign(testPayload, 'wrong-secret');

            const result = verifyAccessToken(wrongSecretToken);
            expect(result).toBeNull();
        });
    });

    describe('verifyRefreshToken', () => {
        it('should return decoded payload for valid token', () => {
            const token = signRefreshToken(testPayload);
            const decoded = verifyRefreshToken(token);

            expect(decoded).toBeDefined();
            expect(decoded.id).toBe(testPayload.id);
        });

        it('should return null for invalid token', () => {
            const result = verifyRefreshToken('invalid.token.here');

            expect(result).toBeNull();
        });

        it('should return null for access token (wrong secret)', () => {
            // Access token uses different secret than refresh token
            const accessToken = signAccessToken(testPayload);
            const result = verifyRefreshToken(accessToken);

            expect(result).toBeNull();
        });
    });

    describe('hashToken', () => {
        it('should return a SHA-256 hash of the token', () => {
            const token = 'test-token-123';
            const hash = hashToken(token);

            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
            expect(hash).toHaveLength(64); // SHA-256 produces 64 hex chars
        });

        it('should produce consistent hash for same input', () => {
            const token = 'consistent-token';
            const hash1 = hashToken(token);
            const hash2 = hashToken(token);

            expect(hash1).toBe(hash2);
        });

        it('should produce different hash for different input', () => {
            const hash1 = hashToken('token-1');
            const hash2 = hashToken('token-2');

            expect(hash1).not.toBe(hash2);
        });
    });

    describe('generateRandomToken', () => {
        it('should generate a random token with default length', () => {
            const token = generateRandomToken();

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.length).toBe(96); // 48 bytes = 96 hex chars
        });

        it('should generate token with custom byte length', () => {
            const token = generateRandomToken(32);

            expect(token).toBeDefined();
            expect(token.length).toBe(64); // 32 bytes = 64 hex chars
        });

        it('should generate unique tokens on each call', () => {
            const token1 = generateRandomToken();
            const token2 = generateRandomToken();

            expect(token1).not.toBe(token2);
        });
    });
});
