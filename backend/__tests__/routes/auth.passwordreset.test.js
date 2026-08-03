/**
 * Tests for POST /api/auth/forgot-password and POST /api/auth/reset-password.
 *
 * The email module is mocked so no real Brevo API call is made.
 * The User model is mocked to avoid needing a real DB connection.
 *
 * process.env.JWT_SECRET is set before any require() so auth.js captures it.
 *
 * express-rate-limit is mocked as a passthrough: the forgot-password limiter
 * allows only 3 requests per 15-min window, which would cause later tests in
 * this file to get 429 instead of the expected 200.
 * The rate-limit behaviour itself is covered in auth.ratelimit.test.js.
 */

process.env.JWT_SECRET = 'test-secret-for-jest';

jest.mock('../../db', () => ({}));
jest.mock('../../models/User');
jest.mock('../../email');

// Bypass all rate limiters so test-order effects don't cause spurious 429s.
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const crypto  = require('crypto');
const User    = require('../../models/User');
const { sendPasswordResetEmail } = require('../../email');
const app     = require('../../server');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Makes a minimal mock User document with save() */
function makeMockUser(overrides = {}) {
  return {
    _id:                 { toString: () => 'user-1' },
    email:               'alice@example.com',
    passwordHash:        'salt:hash',
    passwordResetToken:  null,
    passwordResetExpiry: null,
    save:                jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const VALID_EMAIL = 'alice@example.com';
const GENERIC_MSG = 'If an account with that email exists, a reset link has been sent.';

// ── POST /api/auth/forgot-password ────────────────────────────────────────────

describe('POST /api/auth/forgot-password', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 200 with generic message when user exists and sends email', async () => {
    const mockUser = makeMockUser();
    User.findOne.mockResolvedValue(mockUser);
    sendPasswordResetEmail.mockResolvedValue({});

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: VALID_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);
    expect(mockUser.save).toHaveBeenCalled();
    expect(sendPasswordResetEmail).toHaveBeenCalledWith(
      VALID_EMAIL,
      expect.stringContaining('?resetToken=')
    );
  });

  it('stores a SHA-256 hash of the token in the DB (not the raw token)', async () => {
    const mockUser = makeMockUser();
    User.findOne.mockResolvedValue(mockUser);
    sendPasswordResetEmail.mockResolvedValue({});

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: VALID_EMAIL });

    // The reset URL in the email contains the raw token
    const [[, resetUrl]] = sendPasswordResetEmail.mock.calls;
    const rawToken = new URL(resetUrl).searchParams.get('resetToken');
    const expectedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // The stored token should be the hash, not the raw value
    expect(mockUser.passwordResetToken).toBe(expectedHash);
    expect(mockUser.passwordResetToken).not.toBe(rawToken);
  });

  it('returns the same generic 200 when no user with that email exists', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns the same generic 200 for invalid email format', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);
    expect(sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('returns generic 200 even when sendPasswordResetEmail throws', async () => {
    const mockUser = makeMockUser();
    User.findOne.mockResolvedValue(mockUser);
    sendPasswordResetEmail.mockRejectedValue(new Error('Brevo API unavailable'));

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: VALID_EMAIL });

    // Must not leak the error — still 200 to prevent enumeration
    expect(res.status).toBe(200);
    expect(res.body.message).toBe(GENERIC_MSG);
  });

  it('sets an expiry ~1 hour in the future', async () => {
    const mockUser = makeMockUser();
    User.findOne.mockResolvedValue(mockUser);
    sendPasswordResetEmail.mockResolvedValue({});

    const before = Date.now();

    await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: VALID_EMAIL });

    const expiryMs = new Date(mockUser.passwordResetExpiry).getTime();
    const diffMs   = expiryMs - before;

    // Should be ~1 hour (within a 5-second tolerance for test execution time)
    expect(diffMs).toBeGreaterThan(60 * 60 * 1000 - 5000);
    expect(diffMs).toBeLessThan(60 * 60 * 1000 + 5000);
  });
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

describe('POST /api/auth/reset-password', () => {
  beforeEach(() => jest.clearAllMocks());

  /** Builds a valid raw token and the corresponding hash fixture */
  function makeTokenPair() {
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    return { rawToken, tokenHash };
  }

  it('resets password and clears token fields on valid request', async () => {
    const { rawToken, tokenHash } = makeTokenPair();
    const mockUser = makeMockUser({
      passwordResetToken:  tokenHash,
      passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
    });
    User.findOne.mockResolvedValue(mockUser);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'NewSecure1!' });

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/updated successfully/i);
    expect(mockUser.passwordResetToken).toBeNull();
    expect(mockUser.passwordResetExpiry).toBeNull();
    expect(mockUser.save).toHaveBeenCalled();
  });

  it('returns 400 when token is missing', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ newPassword: 'NewSecure1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/token is required/i);
  });

  it('returns 400 when new password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'sometoken', newPassword: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('returns 400 when token is invalid (not found in DB)', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'bad-token-value', newPassword: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it('returns 400 when token is expired ($gt filter returns null)', async () => {
    // DB returns null because the expiry filter eliminates the document
    User.findOne.mockResolvedValue(null);
    const { rawToken } = makeTokenPair();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'ValidPass1!' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or has expired/i);
  });

  it('queries by SHA-256 hash of the raw token', async () => {
    const { rawToken, tokenHash } = makeTokenPair();
    const mockUser = makeMockUser({
      passwordResetToken:  tokenHash,
      passwordResetExpiry: new Date(Date.now() + 60 * 60 * 1000),
    });
    User.findOne.mockResolvedValue(mockUser);

    await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'ValidPass1!' });

    expect(User.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ passwordResetToken: tokenHash })
    );
  });

  it('returns 500 when User.findOne throws', async () => {
    User.findOne.mockRejectedValue(new Error('DB read error'));
    const { rawToken } = makeTokenPair();

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: rawToken, newPassword: 'ValidPass1!' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to reset/i);
  });
});
