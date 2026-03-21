const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password, role } = req.body;
  
  db.get(`SELECT * FROM User WHERE email = ?`, [email], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) return res.status(400).json({ error: 'User already exists' });

    db.run(`INSERT INTO User (name, email, password, role) VALUES (?, ?, ?, ?)`, 
      [name, email, password, role], 
      function(err) {
        if (err) return res.status(500).json({ error: 'Failed to register user' });
        res.status(201).json({ message: 'User created successfully', user: { id: this.lastID, name, email, role } });
      });
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  
  db.get(`SELECT * FROM User WHERE email = ?`, [email], (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!user) return res.status(404).json({ error: 'User not found' });

    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({ message: 'Login successful', user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  });
});

module.exports = router;
