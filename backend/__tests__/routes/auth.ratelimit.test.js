/**
 * Rate limiting tests for auth routes.
 *
 * Each Jest test file runs in its own worker process, giving a fresh module
 * registry (and therefore a fresh MemoryStore for express-rate-limit).
 * Within this file we fire enough sequential requests to exhaust the limit,
 * then assert the next request returns 429.
 */
const mockPrisma = require('../helpers/mockPrisma');
jest.mock('../../db', () => mockPrisma);

const request = require('supertest');
const app = require('../../server');

describe('POST /api/auth/signin — rate limiting', () => {
  // The signin limiter allows 10 *failed* attempts per 15-min window per IP.
  // skipSuccessfulRequests: true means only non-2xx count against the limit.
  // We mock all users as "not found" so every request returns 401.

  it('returns 429 after 10 consecutive failed sign-in attempts', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null); // always → 401

    const LIMIT = 10;
    let lastResponse;

    for (let i = 0; i <= LIMIT; i++) {
      lastResponse = await request(app)
        .post('/api/auth/signin')
        .send({ email: 'attacker@example.com', password: 'wrongpass' });
    }

    // The (LIMIT + 1)th request should be rate-limited
    expect(lastResponse.status).toBe(429);
    expect(lastResponse.body.error).toMatch(/too many sign-in attempts/i);
  });

  it('responds with standard RateLimit headers on a rate-limited request', async () => {
    // The store is already exhausted from the previous test in this describe block.
    // One more request will still be rate-limited.
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'attacker@example.com', password: 'wrongpass' });

    expect(res.status).toBe(429);
    // express-rate-limit with standardHeaders: 'draft-7' sets RateLimit-* headers
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });
});

describe('POST /api/auth/signup — rate limiting', () => {
  // The signup limiter allows 5 attempts per 15-min window per IP (all responses count).

  it('returns 429 after 5 consecutive sign-up attempts', async () => {
    // Simulate all signups failing with 409 (email already exists) so the
    // limiter counts them — but even successes count (no skipSuccessfulRequests).
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-user' });

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
