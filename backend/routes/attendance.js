const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/attendance - Mark attendance
router.post('/', (req, res) => {
  const { userId, classId, status } = req.body;

  db.run(`INSERT INTO Attendance (userId, classId, status) VALUES (?, ?, ?)`, 
    [userId, classId, status], 
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to mark attendance' });
      res.status(201).json({ message: 'Attendance marked', record: { id: this.lastID, userId, classId, status } });
    });
});

// GET /api/attendance/class/:id - Get attendance for a class
router.get('/class/:id', (req, res) => {
  const classId = req.params.id;
  db.all(`
    SELECT Attendance.id, Attendance.classId, Attendance.status, Attendance.date, Attendance.userId, User.name as userName
    FROM Attendance
    LEFT JOIN User ON Attendance.userId = User.id
    WHERE classId = ?
  `, [classId], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch attendance' });
    
    const records = rows.map(r => ({
      ...r,
      user: { id: r.userId, name: r.userName }
    }));
    res.json(records);
  });
});

module.exports = router;
