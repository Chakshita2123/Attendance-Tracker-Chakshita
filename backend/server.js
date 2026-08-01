const path = require('path');
const fs   = require('fs');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

require('./db'); // 👈 yeh line add ki hai — MongoDB connection ab yahan se trigger hoga

const app = express();
const PORT = process.env.PORT || 5000;

// ── CORS ──────────────────────────────────────────────────────────────────────
// In the unified deployment the frontend is served from the same Express origin,
// so there are no cross-origin API calls from the browser in production.
// We still allow all origins here to support local development (Vite dev server
// on :5173 calling the Express dev server on :5000) and any future integrations.
app.use(cors({ optionsSuccessStatus: 200 }));
app.use(express.json());

// ── Route groups ──────────────────────────────────────────────────────────────
const classRoutes      = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const authRoutes       = require('./routes/auth');
const dataRoutes       = require('./routes/data');

app.use('/api/auth',       authRoutes);
app.use('/api/classes',    classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/data',       dataRoutes);

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