const mockPrisma = require('../helpers/mockPrisma');
jest.mock('../../db', () => mockPrisma);

const request = require('supertest');
const app = require('../../server');

describe('GET /api/data', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('userId required');
  });

  it('returns null when user has no saved data', async () => {
    mockPrisma.userData.findUnique.mockResolvedValue(null);
    const res = await request(app).get('/api/data?userId=abc-123');
    expect(res.status).toBe(200);
    expect(res.body).toBeNull();
  });

  it('returns parsed JSON data for existing user', async () => {
    const data = { subjects: ['Math', 'Physics'], phase: 'active' };
    mockPrisma.userData.findUnique.mockResolvedValue({
      userId: 'abc-123',
      dataJson: JSON.stringify(data),
    });
    const res = await request(app).get('/api/data?userId=abc-123');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(data);
  });

  it('calls findUnique with correct userId', async () => {
    mockPrisma.userData.findUnique.mockResolvedValue(null);
    await request(app).get('/api/data?userId=test-uuid-456');
    expect(mockPrisma.userData.findUnique).toHaveBeenCalledWith({
      where: { userId: 'test-uuid-456' },
    });
  });

  it('returns 500 when Prisma throws', async () => {
    mockPrisma.userData.findUnique.mockRejectedValue(new Error('DB connection failed'));
    const res = await request(app).get('/api/data?userId=abc-123');
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Database error');
  });
});

describe('POST /api/data', () => {
  it('returns 400 when userId is missing', async () => {
    const res = await request(app)
      .post('/api/data')
      .send({ data: { subjects: [] } });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('userId and data required');
  });

  it('returns 400 when data is missing', async () => {
    const res = await request(app)
      .post('/api/data')
      .send({ userId: 'abc-123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('userId and data required');
  });

  it('successfully upserts data', async () => {
    mockPrisma.userData.upsert.mockResolvedValue({
      userId: 'abc-123',
      dataJson: '{"subjects":["Math"]}',
    });
    const res = await request(app)
      .post('/api/data')
      .send({ userId: 'abc-123', data: { subjects: ['Math'] } });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Data saved successfully');
  });

  it('calls upsert with correct arguments', async () => {
    mockPrisma.userData.upsert.mockResolvedValue({});
    const data = { subjects: ['Math'], phase: 'setup' };
    await request(app)
      .post('/api/data')
      .send({ userId: 'uuid-789', data });

    const dataString = JSON.stringify(data);
    expect(mockPrisma.userData.upsert).toHaveBeenCalledWith({
      where: { userId: 'uuid-789' },
      create: { userId: 'uuid-789', dataJson: dataString },
      update: { dataJson: dataString },
    });
  });

  it('returns 500 when Prisma upsert throws', async () => {
    mockPrisma.userData.upsert.mockRejectedValue(new Error('Upsert failed'));
    const res = await request(app)
      .post('/api/data')
      .send({ userId: 'abc-123', data: { subjects: [] } });
    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to save data');
  });

  it('handles large data payloads', async () => {
    const largeData = {
      subjects: Array.from({ length: 50 }, (_, i) => `Subject ${i}`),
      attendance: Object.fromEntries(
        Array.from({ length: 365 }, (_, i) => [`2025-01-${String(i + 1).padStart(2, '0')}`, { Math: 'P' }])
      ),
    };
    mockPrisma.userData.upsert.mockResolvedValue({});
    const res = await request(app)
      .post('/api/data')
      .send({ userId: 'abc-123', data: largeData });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Data saved successfully');
  });
});
