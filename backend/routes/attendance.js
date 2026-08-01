const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');

// POST /api/attendance - Mark attendance
router.post('/', async (req, res) => {
  const { userId, classId, status } = req.body;
  if (!userId || !classId || !status) {
    return res.status(400).json({ error: 'userId, classId, and status are required' });
  }

  try {
    const record = await Attendance.create({ userId, classId, status });
    res.status(201).json({ message: 'Attendance marked', record });
  } catch (err) {
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

// GET /api/attendance/class/:id - Get attendance for a class
router.get('/class/:id', async (req, res) => {
  const classId = req.params.id;

  try {
    const records = await Attendance.find({ classId });
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch attendance' });
  }
});

module.exports = router;
