process.env.JWT_SECRET = 'test-secret-for-jest';

/**
 * Tests for Term routes (/api/terms).
 * Mongoose Term model and auth middleware are mocked.
 */

jest.mock('../../db', () => ({}));
jest.mock('../../models/Term');
jest.mock('../../auth', () => {
  const original = jest.requireActual('../../auth');
  return {
    ...original,
    requireAuth: (req, res, next) => {
      const token = req.get('authorization');
      if (!token) return res.status(401).json({ error: 'Missing auth token' });
      req.user = { id: '507f1f77bcf86cd799439011', email: 'test@example.com' };
      next();
    },
  };
});

const request = require('supertest');
const Term    = require('../../models/Term');
const app     = require('../../server');

describe('GET /api/terms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when auth header is missing', async () => {
    const res = await request(app).get('/api/terms');
    expect(res.status).toBe(401);
  });

  it('returns list of terms for authenticated user', async () => {
    const terms = [
      { _id: 't1', name: 'Fall 2026', startDate: '2026-08-01', endDate: '2026-12-15', isCurrent: true },
    ];
    Term.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(terms) });

    const res = await request(app)
      .get('/api/terms')
      .set('authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(terms);
  });
});

describe('POST /api/terms', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a new term successfully', async () => {
    const newTerm = {
      _id: 't1',
      name: 'Fall 2026',
      startDate: '2026-08-01',
      endDate: '2026-12-15',
      isCurrent: true,
    };
    Term.updateMany.mockResolvedValue({});
    Term.create.mockResolvedValue(newTerm);

    const res = await request(app)
      .post('/api/terms')
      .set('authorization', 'Bearer valid-token')
      .send({
        name: 'Fall 2026',
        startDate: '2026-08-01',
        endDate: '2026-12-15',
        isCurrent: true,
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newTerm);
    expect(Term.updateMany).toHaveBeenCalledWith({ userId: '507f1f77bcf86cd799439011' }, { isCurrent: false });
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/terms')
      .set('authorization', 'Bearer valid-token')
      .send({ name: 'Fall 2026' }); // missing dates

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });
});

describe('PUT /api/terms/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('updates a term and sets as current', async () => {
    const mockTermDoc = {
      _id: 't1',
      name: 'Fall 2026',
      isCurrent: false,
      save: jest.fn().mockResolvedValue(undefined),
    };
    Term.findOne.mockResolvedValue(mockTermDoc);
    Term.updateMany.mockResolvedValue({});

    const res = await request(app)
      .put('/api/terms/t1')
      .set('authorization', 'Bearer valid-token')
      .send({ isCurrent: true, name: 'Fall 2026 Revised' });

    expect(res.status).toBe(200);
    expect(mockTermDoc.isCurrent).toBe(true);
    expect(mockTermDoc.name).toBe('Fall 2026 Revised');
    expect(mockTermDoc.save).toHaveBeenCalled();
  });

  it('returns 404 if term is not found', async () => {
    Term.findOne.mockResolvedValue(null);

    const res = await request(app)
      .put('/api/terms/t999')
      .set('authorization', 'Bearer valid-token')
      .send({ name: 'Ghost Term' });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/terms/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('deletes a term successfully', async () => {
    Term.findOneAndDelete.mockResolvedValue({ _id: 't1' });

    const res = await request(app)
      .delete('/api/terms/t1')
      .set('authorization', 'Bearer valid-token');

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('t1');
  });

  it('returns 404 if term is not found', async () => {
    Term.findOneAndDelete.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/terms/t999')
      .set('authorization', 'Bearer valid-token');

    expect(res.status).toBe(404);
  });
});
