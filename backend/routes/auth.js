const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const {
  createToken,
  hashPassword,
  normalizeEmail,
  requireAuth,
  verifyPassword,
} = require('../auth');

const router = express.Router();

// ── Rate Limiters ──────────────────────────────────────────────────────────────
// Scoped per IP address. Counts only non-successful responses for signin.
// In-memory store — adequate for single-instance deployments. For multi-instance
// production, swap MemoryStore for a Redis store (e.g. rate-limit-redis).

const signinLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  limit: 10,                       // max 10 failed attempts per window per IP
  skipSuccessfulRequests: true,    // only count non-2xx responses (failed logins)
  standardHeaders: 'draft-7',      // RFC-standard RateLimit headers
  legacyHeaders: false,
  message: {
    error: 'Too many sign-in attempts. Please try again in 15 minutes.',
  },
});

const signupLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  limit: 5,                        // max 5 signup attempts per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many sign-up attempts. Please try again in 15 minutes.',
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeUser(user) {
  return {
    id:    user._id.toString(),
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

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/signup', signupLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const user = await User.create({
      email,
      passwordHash: hashPassword(password),
    });

    const token = createToken(user._id.toString(), user.email);

    res.status(201).json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account: ' + error.message });
  }
});

router.post('/signin', signinLimiter, async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  const validationError = validateCredentials(email, password);

  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  try {
    const user = await User.findOne({ email });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken(user._id.toString(), user.email);
    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign in: ' + error.message });
  }
});

router.get('/me', requireAuth, (req, res) => {
  // req.user is populated by requireAuth from the JWT payload — no DB call needed
  res.json({ user: req.user });
});

router.post('/logout', requireAuth, (req, res) => {
  // Stateless JWT: no server-side session to delete.
  // The client clears the token from localStorage; this route just confirms logout.
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
