const express = require('express');
const router = express.Router();
const prisma = require('../db');
const { requireAuth } = require('../stackAuth');

// GET /api/data
router.get('/', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const row = await prisma.userData.findUnique({ where: { userId } });
    if (!row) return res.json(null);
    res.json(JSON.parse(row.dataJson));
  } catch (err) {
    res.status(500).json({ error: 'Database error: ' + err.message });
  }
});

// POST /api/data
router.post('/', requireAuth, async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: 'data required' });

  try {
    const userId = req.user.id;
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
