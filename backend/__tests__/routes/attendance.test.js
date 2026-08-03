process.env.JWT_SECRET = 'test-secret-for-jest';

/**
 * Tests for POST /api/attendance and GET /api/attendance/class/:id.
 * Mongoose Attendance model is mocked — no real DB connection.
 */

jest.mock('../../db', () => ({}));
jest.mock('../../models/Attendance');

const request    = require('supertest');
const Attendance = require('../../models/Attendance');
const app        = require('../../server');

describe('POST /api/attendance', () => {
  beforeEach(() => jest.clearAllMocks());

  it('marks attendance successfully', async () => {
    const record = { userId: 'uuid-student', classId: 'class-5', status: 'present', date: new Date().toISOString() };
    Attendance.create.mockResolvedValue(record);

    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student', classId: 'class-5', status: 'present' });

    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Attendance marked');
    expect(res.body.record).toEqual(record);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student' }); // missing classId and status

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 500 when Attendance.create throws', async () => {
    Attendance.create.mockRejectedValue(new Error('Create failed'));

    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student', classId: 'class-5', status: 'present' });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to mark attendance');
  });
});

describe('GET /api/attendance/class/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns attendance records for a class', async () => {
    const records = [
      { userId: 'uuid-1', classId: 'class-3', status: 'present', date: '2025-03-20T09:00:00.000Z' },
      { userId: 'uuid-2', classId: 'class-3', status: 'absent',  date: '2025-03-20T09:00:00.000Z' },
    ];
    Attendance.find.mockResolvedValue(records);

    const res = await request(app).get('/api/attendance/class/class-3');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(records);
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array for a class with no attendance records', async () => {
    Attendance.find.mockResolvedValue([]);

    const res = await request(app).get('/api/attendance/class/class-99');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 when Attendance.find throws', async () => {
    Attendance.find.mockRejectedValue(new Error('Query failed'));

    const res = await request(app).get('/api/attendance/class/class-3');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch attendance');
  });
});
