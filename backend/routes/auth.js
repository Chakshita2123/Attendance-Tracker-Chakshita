const express = require('express');
const prisma = require('../db');
const {
  createSession,
  hashPassword,
  normalizeEmail,
  requireAuth,
  verifyPassword,
} = require('../auth');

const router = express.Router();

function sanitizeUser(user) {
  return {
    id: user.id,
    email: user.email,
  };
}

function validateCredentials(email, password) {
  if (!email || !password) {
    return 'Email and password are required';
  }

  if (password.length < 6) {
    return 'Password must be at least 6 characters long';
  }

  return null;
}

router.post('/signup', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(password),
      },
    });
    const token = await createSession(user.id);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account: ' + error.message });
  }
});

router.post('/signin', async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = await createSession(user.id);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign in: ' + error.message });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, async (req, res) => {
  try {
    await prisma.session.delete({ where: { id: req.session.id } });
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to log out: ' + error.message });
  }
});

module.exports = router;
