const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/classes - Create a new class
router.post('/', (req, res) => {
  const { name, schedule, teacherId } = req.body;
  
  db.get(`SELECT * FROM User WHERE id = ?`, [teacherId], (err, teacher) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!teacher || teacher.role !== 'Teacher') {
      return res.status(400).json({ error: 'Invalid teacher ID' });
    }

    db.run(`INSERT INTO Class (name, schedule, teacherId) VALUES (?, ?, ?)`, 
      [name, schedule, teacherId], 
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to create class' });
        res.status(201).json({ id: this.lastID, name, schedule, teacherId });
      });
  });
});

// GET /api/classes - Get all classes
router.get('/', (req, res) => {
  db.all(`
    SELECT Class.id, Class.name, Class.schedule, Class.teacherId, User.name as teacherName 
    FROM Class 
    LEFT JOIN User ON Class.teacherId = User.id
  `, [], (err, rows) => {
    if (err) return res.status(500).json({ error: 'Failed to fetch classes' });
    
    // Format the response similarly to how Prisma did it
    const classes = rows.map(r => ({
      ...r,
      teacher: { id: r.teacherId, name: r.teacherName }
    }));
    res.json(classes);
  });
});

module.exports = router;
