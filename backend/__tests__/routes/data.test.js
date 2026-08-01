/**
 * Tests for GET /api/data and POST /api/data with the new relational backend.
 *
 * Mocked Prisma calls:
 *  GET /api/data  → class.findMany, attendance.findMany (with include), userData.findUnique
 *  POST /api/data → class.upsert, class.findMany (×2), attendance.upsert,
 *                   attendance.deleteMany, class.deleteMany, userData.findUnique,
 *                   userData.upsert
 */
const mockPrisma = require('../helpers/mockPrisma');

jest.mock('../../db', () => mockPrisma);
jest.mock('../../auth', () => ({
  requireAuth: (req, res, next) => {
    const token = req.get('authorization');
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    req.user = { id: 'user-abc' };
    next();
  },
}));

const request = require('supertest');
const app = require('../../server');

// ── Shared fixtures ───────────────────────────────────────────────────────────

const USER_ID = 'user-abc';

// Ordered alphabetically — matches the route's orderBy: { name: 'asc' }
const CLASSES = [
  { id: 1, name: 'MATH',    userId: USER_ID },
  { id: 2, name: 'PHYSICS', userId: USER_ID },
];

const ATTENDANCE_ROWS = [
  {
    id: 1, userId: USER_ID, classId: 1,
    date: new Date('2025-07-01T00:00:00.000Z'),
    status: 'P',
    class: { id: 1, name: 'MATH', userId: USER_ID },
  },
  {
    id: 2, userId: USER_ID, classId: 2,
    date: new Date('2025-07-01T00:00:00.000Z'),
    status: 'A',
    class: { id: 2, name: 'PHYSICS', userId: USER_ID },
  },
];

const USER_DATA = {
  userId: USER_ID,
  dataJson: JSON.stringify({
    timetable: { Mon: [{ id: 'abc', subject: 'PHYSICS', start: '09:00', duration: 60 }] },
    historicalAttendance: { PHYSICS: { P: 5, A: 1, L: 0, total: 6 } },
    phase: 'ready',
    lectureSettings: { durationMinutes: 60 },
    dailyLog: {},
    subjects: ['PHYSICS', 'MATH'],
  }),
  version: 3,
};

// Convenience: set up all three mocks for a successful GET
function mockSuccessfulGet() {
  mockPrisma.class.findMany.mockResolvedValue(CLASSES);
  mockPrisma.attendance.findMany.mockResolvedValue(ATTENDANCE_ROWS);
  mockPrisma.userData.findUnique.mockResolvedValue(USER_DATA);
}

// Convenience: set up mocks for a successful POST (no deleted subjects)
function mockSuccessfulPost() {
  mockPrisma.class.upsert.mockResolvedValue({ id: 1, name: 'PHYSICS', userId: USER_ID });
  mockPrisma.class.findMany
    .mockResolvedValueOnce(CLASSES)   // first call: get existing classes
    .mockResolvedValueOnce(CLASSES);  // second call: get current classes for classId map
  mockPrisma.attendance.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.class.deleteMany.mockResolvedValue({ count: 0 });
  mockPrisma.attendance.upsert.mockResolvedValue({});
  mockPrisma.userData.findUnique.mockResolvedValue(USER_DATA);
  mockPrisma.userData.upsert.mockResolvedValue({ userId: USER_ID, version: 4 });
}

// ── GET /api/data ──────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  it('returns 401 when auth token is missing', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing auth token');
  });

  it('assembles the full response from relational tables + config blob', async () => {
    mockSuccessfulGet();

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(200);

    // subjects come from Class rows (returned in fixture order, which matches orderBy:name:asc)
    expect(res.body.subjects).toEqual(['MATH', 'PHYSICS']);

    // attendance is built from Attendance rows
    expect(res.body.attendance).toEqual({
      '2025-07-01': { MATH: 'P', PHYSICS: 'A' },
    });
    expect(res.body.dailyLog).toEqual({
      '2025-07-01': { MATH: 'P', PHYSICS: 'A' },
    });

    // config comes from UserData blob
    expect(res.body.phase).toBe('ready');
    expect(res.body.lectureSettings).toEqual({ durationMinutes: 60 });
    expect(res.body.historicalAttendance).toEqual({ PHYSICS: { P: 5, A: 1, L: 0, total: 6 } });

    // _version is exposed for optimistic concurrency
    expect(res.body._version).toBe(3);
  });

  it('returns empty defaults when user has no data at all', async () => {
    mockPrisma.class.findMany.mockResolvedValue([]);
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.userData.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.subjects).toEqual([]);
    expect(res.body.attendance).toEqual({});
    expect(res.body.phase).toBe('setup');
    expect(res.body._version).toBe(0);
  });

  it('calls Prisma with correct userId', async () => {
    mockSuccessfulGet();
    await request(app).get('/api/data').set('authorization', 'Bearer token');

    expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
    expect(mockPrisma.attendance.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
    expect(mockPrisma.userData.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });

  it('returns 500 when a Prisma call throws', async () => {
    mockPrisma.class.findMany.mockRejectedValue(new Error('DB connection lost'));
    mockPrisma.attendance.findMany.mockResolvedValue([]);
    mockPrisma.userData.findUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Database error');
  });
});

// ── POST /api/data ─────────────────────────────────────────────────────────────

describe('POST /api/data', () => {
  const VALID_PAYLOAD = {
    data: {
      subjects:             ['PHYSICS', 'MATH'],
      timetable:            { Mon: [] },
      attendance:           { '2025-07-02': { PHYSICS: 'P' } },
      dailyLog:             {},
      historicalAttendance: {},
      phase:                'ready',
      lectureSettings:      { durationMinutes: 60 },
      _version:             3, // matches USER_DATA.version
    },
  };

  it('returns 401 when auth token is missing', async () => {
    const res = await request(app).post('/api/data').send(VALID_PAYLOAD);
    expect(res.status).toBe(401);
  });

  it('returns 400 when data field is missing', async () => {
    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('data required');
  });

  it('successfully saves data and returns 200', async () => {
    mockSuccessfulPost();

    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Data saved successfully');
  });

  it('upserts a Class row for each subject', async () => {
    mockSuccessfulPost();

    await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    // One upsert per subject
    expect(mockPrisma.class.upsert).toHaveBeenCalledTimes(2);
    expect(mockPrisma.class.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_name: { userId: USER_ID, name: 'PHYSICS' } },
      })
    );
  });

  it('upserts an Attendance row for each date/subject mark', async () => {
    mockSuccessfulPost();

    await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    expect(mockPrisma.attendance.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId_classId_date: expect.objectContaining({ userId: USER_ID }),
        }),
        create: expect.objectContaining({ status: 'P' }),
        update: { status: 'P' },
      })
    );
  });

  it('returns 409 Conflict when _version is stale', async () => {
    // Server version is 3; client sends version 1 (stale)
    mockPrisma.class.upsert.mockResolvedValue({ id: 1, name: 'PHYSICS', userId: USER_ID });
    mockPrisma.class.findMany.mockResolvedValue(CLASSES);
    mockPrisma.attendance.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.class.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.attendance.upsert.mockResolvedValue({});
    mockPrisma.userData.findUnique.mockResolvedValue(USER_DATA); // version: 3

    const stalePayload = {
      data: {
        ...VALID_PAYLOAD.data,
        _version: 1, // stale — server is at version 3
      },
    };

    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(stalePayload);

    expect(res.status).toBe(409);
    expect(res.body.error).toBe('conflict');
    expect(res.body.message).toMatch(/modified in another tab/i);
    expect(res.body.serverVersion).toBe(3);
    expect(res.body.clientVersion).toBe(1);
  });

  it('treats missing _version as 0 (backward compat) and saves successfully', async () => {
    // Server has no UserData row yet (version = 0 implied)
    mockPrisma.class.upsert.mockResolvedValue({ id: 1, name: 'PHYSICS', userId: USER_ID });
    mockPrisma.class.findMany.mockResolvedValue(CLASSES);
    mockPrisma.attendance.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.class.deleteMany.mockResolvedValue({ count: 0 });
    mockPrisma.attendance.upsert.mockResolvedValue({});
    mockPrisma.userData.findUnique.mockResolvedValue(null); // no existing row
    mockPrisma.userData.upsert.mockResolvedValue({ userId: USER_ID, version: 1 });

    const payloadWithoutVersion = {
      data: { ...VALID_PAYLOAD.data },
    };
    delete payloadWithoutVersion.data._version;

    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(payloadWithoutVersion);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Data saved successfully');
  });

  it('returns 500 when Prisma throws', async () => {
    mockPrisma.class.upsert.mockRejectedValue(new Error('DB error'));

    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to save data');
  });
});
