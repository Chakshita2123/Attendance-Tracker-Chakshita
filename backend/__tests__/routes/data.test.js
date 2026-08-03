process.env.JWT_SECRET = 'test-secret-for-jest';

/**
 * Tests for GET /api/data and POST /api/data.
 *
 * Mongoose models (Class, Attendance, UserData) are mocked via jest.mock().
 * db.js is also mocked so no real MongoDB connection is attempted.
 *
 * The auth middleware is mocked to inject a fixed req.user without a real JWT.
 */

jest.mock('../../db', () => ({}));
jest.mock('../../models/Class');
jest.mock('../../models/Attendance');
jest.mock('../../models/UserData');
jest.mock('../../auth', () => ({
  requireAuth: (req, res, next) => {
    const token = req.get('authorization');
    if (!token) return res.status(401).json({ error: 'Missing auth token' });
    req.user = { id: 'user-abc' };
    next();
  },
}));

const request    = require('supertest');
const app        = require('../../server');
const Class      = require('../../models/Class');
const Attendance = require('../../models/Attendance');
const UserData   = require('../../models/UserData');

// ── Shared fixtures ───────────────────────────────────────────────────────────

const USER_ID = 'user-abc';

const CLASSES = [
  { _id: { toString: () => '1' }, name: 'MATH',    userId: USER_ID },
  { _id: { toString: () => '2' }, name: 'PHYSICS', userId: USER_ID },
];

const ATTENDANCE_ROWS = [
  {
    date:    new Date('2025-07-01T00:00:00.000Z'),
    status:  'P',
    classId: {
      _id:  { toString: () => '1' },
      name: 'MATH',
    },
  },
  {
    date:    new Date('2025-07-01T00:00:00.000Z'),
    status:  'A',
    classId: {
      _id:  { toString: () => '2' },
      name: 'PHYSICS',
    },
  },
];

const USER_DATA_DOC = {
  version: 3,
  data: {
    timetable:            { Mon: [{ id: 'abc', subject: 'PHYSICS', start: '09:00', duration: 60 }] },
    historicalAttendance: { PHYSICS: { P: 5, A: 1, L: 0, total: 6 } },
    phase:                'ready',
    lectureSettings:      { durationMinutes: 60 },
    dailyLog:             {},
    subjects:             ['PHYSICS', 'MATH'],
  },
};

// ── Helpers to set up common mock chains ──────────────────────────────────────

/** Mongoose sort() is called on the result of find(). We mock find() to return
 *  an object with a sort() method that resolves to the data. */
function mockFind(Model, data) {
  Model.find.mockReturnValue({ sort: jest.fn().mockResolvedValue(data) });
}

/** Class.find({ userId }) used in POST for deletion check — returns array directly. */
function mockFindDirect(Model, data) {
  Model.find.mockResolvedValue(data);
}

function mockSuccessfulGet() {
  mockFind(Class, CLASSES);
  // Attendance.find().populate().sort()
  Attendance.find.mockReturnValue({
    populate: jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue(ATTENDANCE_ROWS),
    }),
  });
  UserData.findOne.mockResolvedValue(USER_DATA_DOC);
}

// ── GET /api/data ─────────────────────────────────────────────────────────────

describe('GET /api/data', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns 401 when auth token is missing', async () => {
    const res = await request(app).get('/api/data');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Missing auth token');
  });

  it('assembles the full response from relational collections + config blob', async () => {
    mockSuccessfulGet();

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.subjects).toEqual(['MATH', 'PHYSICS']);
    expect(res.body.attendance).toEqual({
      '2025-07-01': { MATH: 'P', PHYSICS: 'A' },
    });
    expect(res.body.dailyLog).toEqual({
      '2025-07-01': { MATH: 'P', PHYSICS: 'A' },
    });
    expect(res.body.phase).toBe('ready');
    expect(res.body.lectureSettings).toEqual({ durationMinutes: 60 });
    expect(res.body.historicalAttendance).toEqual({ PHYSICS: { P: 5, A: 1, L: 0, total: 6 } });
    expect(res.body._version).toBe(3);
  });

  it('returns empty defaults when user has no data at all', async () => {
    mockFind(Class, []);
    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    });
    UserData.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(200);
    expect(res.body.subjects).toEqual([]);
    expect(res.body.attendance).toEqual({});
    expect(res.body.phase).toBe('setup');
    expect(res.body._version).toBe(0);
  });

  it('returns 500 when a model call throws', async () => {
    Class.find.mockReturnValue({ sort: jest.fn().mockRejectedValue(new Error('DB error')) });
    Attendance.find.mockReturnValue({
      populate: jest.fn().mockReturnValue({ sort: jest.fn().mockResolvedValue([]) }),
    });
    UserData.findOne.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/data')
      .set('authorization', 'Bearer token');

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Database error');
  });
});

// ── POST /api/data ────────────────────────────────────────────────────────────

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
      _version:             3, // matches USER_DATA_DOC.version
    },
  };

  function mockSuccessfulPost() {
    // For upsert of each subject:
    Class.findOneAndUpdate.mockResolvedValue({});

    // First find: existing classes (for deletion check)
    // Second find: current classes (for classId lookup)
    Class.find
      .mockResolvedValueOnce(CLASSES)
      .mockResolvedValueOnce(CLASSES);

    Attendance.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Class.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Attendance.findOneAndUpdate.mockResolvedValue({});
    UserData.findOne.mockResolvedValue({
      ...USER_DATA_DOC,
      data:          {},
      markModified:  jest.fn(),
      save:          jest.fn().mockResolvedValue(undefined),
    });
  }

  beforeEach(() => jest.clearAllMocks());

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

  it('upserts a Class document for each subject', async () => {
    mockSuccessfulPost();

    await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    // One findOneAndUpdate per subject (2 subjects)
    expect(Class.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(Class.findOneAndUpdate).toHaveBeenCalledWith(
      { userId: USER_ID, name: 'PHYSICS' },
      expect.any(Object),
      expect.objectContaining({ upsert: true })
    );
  });

  it('returns 409 Conflict when _version is stale', async () => {
    Class.findOneAndUpdate.mockResolvedValue({});
    Class.find.mockResolvedValue(CLASSES);
    Attendance.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Class.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Attendance.findOneAndUpdate.mockResolvedValue({});
    // Server version is 3 — client sends 1 (stale)
    UserData.findOne.mockResolvedValue({ version: 3 });

    const stalePayload = {
      data: { ...VALID_PAYLOAD.data, _version: 1 },
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

  it('creates a new UserData doc when none exists (first-time save)', async () => {
    Class.findOneAndUpdate.mockResolvedValue({});
    Class.find.mockResolvedValue(CLASSES);
    Attendance.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Class.deleteMany.mockResolvedValue({ deletedCount: 0 });
    Attendance.findOneAndUpdate.mockResolvedValue({});
    UserData.findOne.mockResolvedValue(null);
    UserData.create.mockResolvedValue({});

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
    expect(UserData.create).toHaveBeenCalled();
  });

  it('returns 500 when a model call throws', async () => {
    Class.findOneAndUpdate.mockRejectedValue(new Error('DB write failed'));

    const res = await request(app)
      .post('/api/data')
      .set('authorization', 'Bearer token')
      .send(VALID_PAYLOAD);

    expect(res.status).toBe(500);
    expect(res.body.error).toContain('Failed to save data');
  });
});
