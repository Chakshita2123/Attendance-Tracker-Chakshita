const mockPrisma = require('../helpers/mockPrisma');
jest.mock('../../db', () => mockPrisma);

const request = require('supertest');
const app = require('../../server');

describe('POST /api/attendance', () => {
  it('marks attendance successfully', async () => {
    const record = { id: 1, userId: 'uuid-student', classId: 5, status: 'present', date: new Date().toISOString() };
    mockPrisma.attendance.create.mockResolvedValue(record);

    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student', classId: 5, status: 'present' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('Attendance marked');
    expect(res.body.record).toEqual(record);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('required');
  });

  it('returns 500 when Prisma create throws', async () => {
    mockPrisma.attendance.create.mockRejectedValue(new Error('Create failed'));
    const res = await request(app)
      .post('/api/attendance')
      .send({ userId: 'uuid-student', classId: 5, status: 'present' });
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to mark attendance');
  });
});

describe('GET /api/attendance/class/:id', () => {
  it('returns attendance records for a class', async () => {
    const records = [
      { id: 1, userId: 'uuid-1', classId: 3, status: 'present', date: '2025-03-20T09:00:00.000Z' },
      { id: 2, userId: 'uuid-2', classId: 3, status: 'absent', date: '2025-03-20T09:00:00.000Z' },
    ];
    mockPrisma.attendance.findMany.mockResolvedValue(records);

    const res = await request(app).get('/api/attendance/class/3');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(records);
    expect(res.body).toHaveLength(2);
  });

  it('returns empty array for class with no attendance', async () => {
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    const res = await request(app).get('/api/attendance/class/99');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('calls findMany with parsed classId', async () => {
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    await request(app).get('/api/attendance/class/7');
    expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith({
      where: { classId: 7 },
    });
  });

  it('returns 500 when Prisma findMany throws', async () => {
    mockPrisma.attendance.findMany.mockRejectedValue(new Error('Query failed'));
    const res = await request(app).get('/api/attendance/class/3');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Failed to fetch attendance');
  });
});
