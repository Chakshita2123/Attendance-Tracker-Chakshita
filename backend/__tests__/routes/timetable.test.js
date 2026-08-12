const request = require('supertest');
const app = require('../../server');

describe('POST /api/timetable/parse', () => {
  it('returns 400 when no file or fileData is provided', async () => {
    const res = await request(app)
      .post('/api/timetable/parse')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Please upload a file/i);
  });

  it('returns error when GEMINI_API_KEY is missing or invalid in test env without API key', async () => {
    delete process.env.GEMINI_API_KEY;
    const res = await request(app)
      .post('/api/timetable/parse')
      .send({ fileData: 'dGVzdCBjb250ZW50', mimeType: 'image/png' });
    expect(res.status).toBe(500);
    expect(res.body.error).toMatch(/GEMINI_API_KEY is not configured/i);
  });
});
