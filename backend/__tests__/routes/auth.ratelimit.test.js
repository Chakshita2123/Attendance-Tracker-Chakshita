/**
 * Rate limiting tests for auth routes.
 *
 * Each Jest test file runs in its own worker process, giving a fresh module
 * registry (and therefore a fresh MemoryStore for express-rate-limit).
 * Within this file we fire enough sequential requests to exhaust the limit,
 * then assert the next request returns 429.
 *
 * Models and db are mocked so no real DB connection is needed.
 *
 * NOTE: process.env.JWT_SECRET must be set before requiring any modules so
 * auth.js (which captures JWT_SECRET as a module-level constant) has the value.
 */

process.env.JWT_SECRET = 'test-secret-for-jest';

jest.mock('../../db', () => ({}));
jest.mock('../../models/User');

const request = require('supertest');
const User    = require('../../models/User');
const app     = require('../../server');

// ── POST /api/auth/signin — rate limiting ─────────────────────────────────────
// The signin limiter allows 10 *failed* attempts per 15-min window per IP.
// skipSuccessfulRequests: true means only non-2xx responses count.
// We mock all users as "not found" so every request returns 401.

describe('POST /api/auth/signin — rate limiting', () => {
  it('returns 429 after 10 consecutive failed sign-in attempts', async () => {
    User.findOne.mockResolvedValue(null); // always → 401

    const LIMIT = 10;
    let lastResponse;

    for (let i = 0; i <= LIMIT; i++) {
      lastResponse = await request(app)
        .post('/api/auth/signin')
        .send({ email: `attacker${i}@example.com`, password: 'wrongpassword' });
    }

    // The (LIMIT + 1)th request should be rate-limited
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error).toMatch(/too many sign-in attempts/i);
  });

  it('responds with RateLimit headers on a rate-limited request', async () => {
    // Store is already exhausted from the previous test — one more request stays 429.
    User.findOne.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'attacker@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(429);

    // express-rate-limit v8 uses the RFC 9440 combined header format.
    // The combined header is named 'ratelimit', e.g.: "limit=10, remaining=0, reset=900"
    // (standardHeaders: 'draft-7' in v8 maps to this combined format.)
    expect(res.headers).toHaveProperty('ratelimit');
  });
});

// ── POST /api/auth/signup — rate limiting ─────────────────────────────────────
// The signup limiter allows 5 attempts per 15-min window (all responses count,
// including successes — no skipSuccessfulRequests).

describe('POST /api/auth/signup — rate limiting', () => {
  it('returns 429 after 5 consecutive sign-up attempts', async () => {
    // Simulate existing user so each request fails with 409 (still counts toward limit)
    User.findOne.mockResolvedValue({ _id: 'existing-user' });

    const LIMIT = 5;
    let lastResponse;

    for (let i = 0; i <= LIMIT; i++) {
      lastResponse = await request(app)
        .post('/api/auth/signup')
        .send({ email: `user${i}@example.com`, password: 'password123' });
    }

    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error).toMatch(/too many sign-up attempts/i);
  });
});
