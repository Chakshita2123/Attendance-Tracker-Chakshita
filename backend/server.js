const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const corsOptions = {
  // Allow the configured frontend URL or fallback to allowing all origins (for local development)
  origin: process.env.FRONTEND_URL || '*',
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// Main Root
app.get('/', (req, res) => {
  res.send('Attendance Tracker API is running using Neon PostgreSQL!');
});

const classRoutes = require('./routes/classes');
const attendanceRoutes = require('./routes/attendance');
const authRoutes = require('./routes/auth');
const dataRoutes = require('./routes/data');

app.use('/api/auth', authRoutes);
app.use('/api/classes', classRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/data', dataRoutes);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
