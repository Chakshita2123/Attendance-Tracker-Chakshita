/**
 * Tests for POST /api/auth/signup and POST /api/auth/signin.
 *
 * Models are mocked via jest.mock() so no real DB connection is needed.
 * db.js is also mocked to prevent Mongoose from attempting to connect.
 *
 * process.env.JWT_SECRET must be set BEFORE any require() because auth.js
 * captures it as a module-level constant at load time — if server.js is
 * loaded after auth.js (which require('../../auth') would do), the constant
 * will be undefined and every createToken() call will throw 500.
 *
 * express-rate-limit is mocked with a passthrough so individual route tests
 * don't interfere with each other via exhausted in-memory limiter state.
 * Rate-limiting behaviour is covered in auth.ratelimit.test.js.
 */

process.env.JWT_SECRET = 'test-secret-for-jest';

jest.mock('../../db', () => ({}));
jest.mock('../../models/User');

// Bypass all rate limiters so test order doesn't cause spurious 429s.
// Rate-limit behaviour is tested in auth.ratelimit.test.js which runs
// in its own Jest worker with its own fresh MemoryStore.
jest.mock('express-rate-limit', () => () => (req, res, next) => next());

const request = require('supertest');
const User    = require('../../models/User');
const { hashPassword } = require('../../auth');
const app     = require('../../server');

// ── Shared fixture ────────────────────────────────────────────────────────────

const VALID_EMAIL    = 'alice@example.com';
const VALID_PASSWORD = 'securepass1'; // 10 chars — satisfies the >=8 rule

// ── POST /api/auth/signup ─────────────────────────────────────────────────────

describe('POST /api/auth/signup', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates an account and returns a JWT + sanitized user', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id:          { toString: () => 'user-1' },
      email:        VALID_EMAIL,
      passwordHash: 'salt:hash',
    });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({ id: 'user-1', email: VALID_EMAIL });
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects duplicate emails with 409', async () => {
    User.findOne.mockResolvedValue({ _id: 'existing' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already exists/i);
  });

  it('returns 400 when email is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: VALID_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'not-an-email', password: VALID_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('returns 400 when password is too short (< 8 chars)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: VALID_EMAIL, password: 'short' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('returns 400 when password is missing', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: VALID_EMAIL });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/password is required/i);
  });

  it('returns 500 when User.create throws', async () => {
    User.findOne.mockResolvedValue(null);
    User.create.mockRejectedValue(new Error('DB write failed'));

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to create account/i);
  });
});

// ── POST /api/auth/signin ─────────────────────────────────────────────────────

describe('POST /api/auth/signin', () => {
  beforeEach(() => jest.clearAllMocks());

  it('signs in with valid credentials and returns a JWT', async () => {
    const passwordHash = hashPassword(VALID_PASSWORD);

    User.findOne.mockResolvedValue({
      _id:          { toString: () => 'user-1' },
      email:        VALID_EMAIL,
      passwordHash,
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(VALID_EMAIL);
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects when user is not found (401)', async () => {
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'ghost@example.com', password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('rejects when password is wrong (401)', async () => {
    User.findOne.mockResolvedValue({
      _id:          { toString: () => 'user-1' },
      email:        VALID_EMAIL,
      passwordHash: hashPassword('different-password'),
    });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });

  it('returns 400 when email format is invalid', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'bad@@email', password: VALID_PASSWORD });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('returns 400 when password is too short', async () => {
    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: VALID_EMAIL, password: '7chars1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/at least 8/i);
  });

  it('returns 500 when User.findOne throws', async () => {
    User.findOne.mockRejectedValue(new Error('DB read failed'));

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: VALID_EMAIL, password: VALID_PASSWORD });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/failed to sign in/i);
  });
});
