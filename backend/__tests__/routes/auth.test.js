process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';

jest.mock('../../db', () => ({}));
jest.mock('../../models/User');

const mockVerifyIdToken = jest.fn();
jest.mock('google-auth-library', () => {
  return {
    OAuth2Client: jest.fn().mockImplementation(() => ({
      verifyIdToken: mockVerifyIdToken,
    })),
  };
});

const request = require('supertest');
const User    = require('../../models/User');
const app     = require('../../server');

describe('POST /api/auth/google', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-google-client-id';
  });

  it('returns 400 when credential is missing', async () => {
    const res = await request(app).post('/api/auth/google').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/google credential.*required/i);
  });

  it('returns 500 when GOOGLE_CLIENT_ID is not set', async () => {
    delete process.env.GOOGLE_CLIENT_ID;

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-id-token' });

    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/GOOGLE_CLIENT_ID not configured/i);
  });

  it('creates new user and returns JWT on valid Google token', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-123',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/avatar.jpg',
      }),
    });

    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({
      _id: { toString: () => 'user-db-id-1' },
      email: 'test@example.com',
      googleId: 'google-uid-123',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    });

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-token' });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toEqual({
      id: 'user-db-id-1',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    });
  });

  it('links account by email for existing users who signed up earlier', async () => {
    mockVerifyIdToken.mockResolvedValue({
      getPayload: () => ({
        sub: 'google-uid-456',
        email: 'existing@example.com',
        name: 'Existing User',
        picture: 'https://example.com/pic.jpg',
      }),
    });

    const existingDoc = {
      _id: { toString: () => 'user-existing-id' },
      email: 'existing@example.com',
      googleId: null,
      name: '',
      picture: '',
      save: jest.fn().mockResolvedValue(true),
    };

    // First search by googleId returns null, second search by email returns existingDoc
    User.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existingDoc);

    const res = await request(app)
      .post('/api/auth/google')
      .send({ credential: 'valid-token' });

    expect(res.status).toBe(200);
    expect(existingDoc.googleId).toBe('google-uid-456');
    expect(existingDoc.name).toBe('Existing User');
    expect(existingDoc.save).toHaveBeenCalled();
  });
});
