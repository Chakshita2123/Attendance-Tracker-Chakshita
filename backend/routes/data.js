const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/data?userId=1
router.get('/', (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  db.get(`SELECT data_json FROM UserData WHERE userId = ?`, [userId], (err, row) => {
    if (err) return res.status(500).json({ error: 'Database error ' + err.message });
    if (!row) {
        return res.json(null);
    }
    res.json(JSON.parse(row.data_json));
  });
});

// POST /api/data
router.post('/', (req, res) => {
  const { userId, data } = req.body;
  if (!userId || !data) return res.status(400).json({ error: 'userId and data required' });

  const dataString = JSON.stringify(data);

  db.run(`INSERT INTO UserData (userId, data_json) VALUES (?, ?) 
          ON CONFLICT(userId) DO UPDATE SET data_json = excluded.data_json`, 
    [userId, dataString], 
    function(err) {
      if (err) return res.status(500).json({ error: 'Failed to save data: ' + err.message });
      res.json({ message: 'Data saved successfully' });
    }
  );
});

module.exports = router;
