const express = require('express');
const router = express.Router();
const Class = require('../models/Class');

// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  const { name, schedule, teacherId } = req.body;
  if (!name || !schedule || !teacherId) {
    return res.status(400).json({ error: 'name, schedule, and teacherId are required' });
  }

  try {
    const newClass = await Class.create({ name, schedule, teacherId });
    res.status(201).json(newClass);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create class' });
  }
});

// GET /api/classes - Get all classes
router.get('/', async (req, res) => {
  try {
    const classes = await Class.find();
    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch classes' });
  }
});

module.exports = router;
