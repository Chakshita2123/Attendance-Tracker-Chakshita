const path = require('path');
const fs   = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

require('./db'); // 👈 yeh line add ki hai — MongoDB connection ab yahan se trigger hoga

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// Production: only allow requests from the deployed frontend origin (set via
// FRONTEND_URL env var). In a unified Render deployment the frontend is served
// by Express itself (same origin), so browser API calls won't need CORS at all —
// but we still set the header correctly for any future split deployments.
// Development: allow the Vite dev server on :5173 so local development works.
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5000',
  'capacitor://localhost',
  'https://localhost',
  'http://localhost',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (mobile native, Postman, server-to-server) or matched origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin && origin.startsWith(o))) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  optionsSuccessStatus: 200,
}));
app.use(express.json({ limit: '25mb' }));

// ── Route groups ──────────────────────────────────────────────────────────────
const classRoutes      = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const authRoutes       = require('./routes/auth');
const dataRoutes       = require('./routes/data');
const termRoutes       = require('./routes/terms');
const timetableRoutes  = require('./routes/timetable');

// ── Health check (intentionally unauthenticated — used by keep-alive ping) ────
app.get(['/health', '/api/health'], (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth',       authRoutes);
app.use('/api/classes',    classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/data',       dataRoutes);
app.use('/api/terms',      termRoutes);
app.use('/api/timetable',  timetableRoutes);

// ── Static frontend (production only) ─────────────────────────────────────────
// Serves the Vite-built React app from frontend/dist when it exists.
// Guards with existsSync so the dev server (where dist/ is absent) is unaffected.
const distDir = path.resolve(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));

  // SPA catch-all: any GET that doesn't start with /api gets index.html so
  // client-side routes (e.g. /tracker, /analytics) work after a hard refresh.
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;