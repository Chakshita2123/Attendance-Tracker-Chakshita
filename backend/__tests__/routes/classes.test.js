process.env.JWT_SECRET = 'test-secret-for-jest';

/**
 * Tests for POST /api/classes and GET /api/classes.
 * Mongoose Class model is mocked — no real DB connection.
 */

jest.mock('../../db', () => ({}));
jest.mock('../../models/Class');

const request = require('supertest');
const Class   = require('../../models/Class');
const app     = require('../../server');

describe('POST /api/classes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('creates a class successfully', async () => {
    const newClass = { name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' };
    Class.create.mockResolvedValue(newClass);

    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual(newClass);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101' }); // missing schedule and teacherId

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 500 when Class.create throws', async () => {
    Class.create.mockRejectedValue(new Error('Create failed'));

    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to create class');
  });
});

describe('GET /api/classes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns empty array when no classes exist', async () => {
    Class.find.mockResolvedValue([]);

    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns list of classes', async () => {
    const classes = [
      { name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-1' },
      { name: 'Chemistry 102', schedule: 'Tue 10:00', teacherId: 'uuid-2' },
    ];
    Class.find.mockResolvedValue(classes);

    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(classes);
    expect(res.body).toHaveLength(2);
  });

  it('returns 500 when Class.find throws', async () => {
    Class.find.mockRejectedValue(new Error('Query failed'));

    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch classes');
  });
});
