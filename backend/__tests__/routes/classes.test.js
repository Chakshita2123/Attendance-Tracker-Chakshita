const mockPrisma = require('../helpers/mockPrisma');
jest.mock('../../db', () => mockPrisma);

const request = require('supertest');
const app = require('../../server');

describe('POST /api/classes', () => {
  it('creates a class successfully', async () => {
    const newClass = { id: 1, name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' };
    mockPrisma.class.create.mockResolvedValue(newClass);

    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual(newClass);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 500 when Prisma create throws', async () => {
    mockPrisma.class.create.mockRejectedValue(new Error('Create failed'));
    const res = await request(app)
      .post('/api/classes')
      .send({ name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-teacher' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to create class');
  });
});

describe('GET /api/classes', () => {
  it('returns empty array when no classes exist', async () => {
    mockPrisma.class.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns list of classes', async () => {
    const classes = [
      { id: 1, name: 'Physics 101', schedule: 'Mon 09:00', teacherId: 'uuid-1' },
      { id: 2, name: 'Chemistry 102', schedule: 'Tue 10:00', teacherId: 'uuid-2' },
    ];
    mockPrisma.class.findMany.mockResolvedValue(classes);
    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(classes);
    expect(res.body).toHaveLength(2);
  });

  it('returns 500 when Prisma findMany throws', async () => {
    mockPrisma.class.findMany.mockRejectedValue(new Error('Query failed'));
    const res = await request(app).get('/api/classes');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch classes');
  });
});
