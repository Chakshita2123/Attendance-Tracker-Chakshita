const express = require('express');
const Term = require('../models/Term');
const { requireAuth } = require('../auth');

const router = express.Router();

// ── GET /api/terms — Get all terms for authenticated user ────────────────────
router.get('/', requireAuth, async (req, res) => {
  try {
    const terms = await Term.find({ userId: req.user.id }).sort({ startDate: -1 });
    res.json(terms);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch terms: ' + err.message });
  }
});

// ── POST /api/terms — Create a new term ───────────────────────────────────────
router.post('/', requireAuth, async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  if (!name || !startDate || !endDate) {
    return res.status(400).json({ error: 'name, startDate, and endDate are required.' });
  }

  try {
    if (isCurrent) {
      // Unset isCurrent for all existing terms of this user
      await Term.updateMany({ userId: req.user.id }, { isCurrent: false });
    }

    const term = await Term.create({
      userId: req.user.id,
      name: name.trim(),
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isCurrent: Boolean(isCurrent),
    });

    res.status(201).json(term);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create term: ' + err.message });
  }
});

// ── PUT /api/terms/:id — Update a term ────────────────────────────────────────
router.put('/:id', requireAuth, async (req, res) => {
  const { name, startDate, endDate, isCurrent } = req.body;

  try {
    const term = await Term.findOne({ _id: req.params.id, userId: req.user.id });
    if (!term) {
      return res.status(404).json({ error: 'Term not found.' });
    }

    if (isCurrent) {
      // Unset isCurrent for all other terms of this user
      await Term.updateMany(
        { userId: req.user.id, _id: { $ne: req.params.id } },
        { isCurrent: false }
      );
      term.isCurrent = true;
    } else if (isCurrent === false) {
      term.isCurrent = false;
    }

    if (name) term.name = name.trim();
    if (startDate) term.startDate = new Date(startDate);
    if (endDate) term.endDate = new Date(endDate);

    await term.save();
    res.json(term);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update term: ' + err.message });
  }
});

// ── DELETE /api/terms/:id — Delete a term ─────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const term = await Term.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!term) {
      return res.status(404).json({ error: 'Term not found.' });
    }
    res.json({ message: 'Term deleted successfully', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete term: ' + err.message });
  }
});

module.exports = router;
