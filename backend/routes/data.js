const express = require('express');
const router = express.Router();
const prisma = require('../db');

// GET /api/data?userId=<uuid>
router.get('/', async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  try {
    const row = await prisma.userData.findUnique({ where: { userId } });
    if (!row) return res.json(null);
    res.json(JSON.parse(row.dataJson));
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/data
router.post('/', async (req, res) => {
  const { userId, data } = req.body;
  if (!userId || !data) return res.status(400).json({ error: 'userId and data required' });

  try {
    const dataString = JSON.stringify(data);
    await prisma.userData.upsert({
      where: { userId },
      create: { userId, dataJson: dataString },
      update: { dataJson: dataString },
    });
    res.json({ message: 'Data saved successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save data: ' + err.message });
  }
});

module.exports = router;
