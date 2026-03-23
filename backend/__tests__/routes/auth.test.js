const request = require('supertest');
const mockPrisma = require('../helpers/mockPrisma');

jest.mock('../../db', () => mockPrisma);

const app = require('../../server');

describe('POST /api/auth/signup', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates an account and returns a session token', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash: 'salt:hash',
    });
    mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(201);
    expect(res.body.user).toEqual({
      id: 'user-1',
      email: 'test@example.com',
    });
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects duplicate emails', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/signin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('signs in with valid credentials', async () => {
    const crypto = require('crypto');
    const salt = 'abcd';
    const passwordHash = `${salt}:${crypto.scryptSync('secret123', salt, 64).toString('hex')}`;

    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'test@example.com',
      passwordHash,
    });
    mockPrisma.session.create.mockResolvedValue({ id: 'session-1' });

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('test@example.com');
    expect(typeof res.body.token).toBe('string');
  });

  it('rejects invalid credentials', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/auth/signin')
      .send({ email: 'bad@example.com', password: 'secret123' });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid email or password');
  });
});
