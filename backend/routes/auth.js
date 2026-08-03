const crypto  = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const { sendPasswordResetEmail } = require('../email');
const {
  createToken,
  hashPassword,
  normalizeEmail,
  requireAuth,
  verifyPassword,
} = require('../auth');

// ── Shared email regex (same as validateCredentials) ──────────────────────────
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,       // 15 minutes
  limit: 3,                        // max 3 reset requests per window per IP
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many reset requests. Please try again in 15 minutes.',
  },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function sanitizeUser(user) {
  return {
    id:    user._id.toString(),
    email: user.email,
  };
}

/**
 * Validates email + password for both signup and signin.
 * Returns a human-readable error string, or null if valid.
 * Email is pre-normalised (trimmed + lowercased) by normalizeEmail() before this runs.
 */
function validateCredentials(email, password) {
  if (!email) {
    return 'Email is required.';
  }

  // Basic RFC-5322–inspired email format check (no external library needed)
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(email)) {
    return 'Please enter a valid email address.';
  }

  if (!password) {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
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

// ── POST /api/auth/forgot-password ────────────────────────────────────────────
// Always returns the same 200 response regardless of whether the email exists
// to prevent user enumeration (don't reveal which emails are registered).

router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  const GENERIC_OK = {
    message: 'If an account with that email exists, a reset link has been sent.',
  };

  const email = normalizeEmail(req.body.email);

  // Silently reject invalid emails — still return 200
  if (!email || !EMAIL_RE.test(email)) return res.json(GENERIC_OK);

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json(GENERIC_OK); // no account → same response

    // Generate a cryptographically random token and store only its hash
    const rawToken   = crypto.randomBytes(32).toString('hex');
    const tokenHash  = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiry     = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    user.passwordResetToken  = tokenHash;
    user.passwordResetExpiry = expiry;
    await user.save();

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl    = `${frontendUrl}?resetToken=${rawToken}`;
    await sendPasswordResetEmail(email, resetUrl);

    res.json(GENERIC_OK);
  } catch (err) {
    // Log internally but don't leak the error to avoid enumeration via error messages
    console.error('[forgot-password] error:', err.message);
    res.json(GENERIC_OK);
  }
});

// ── POST /api/auth/reset-password ─────────────────────────────────────────────

router.post('/reset-password', async (req, res) => {
  const rawToken   = String(req.body.token    || '').trim();
  const newPassword = String(req.body.newPassword || '');

  if (!rawToken) {
    return res.status(400).json({ error: 'Reset token is required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
  }

  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

  try {
    const user = await User.findOne({
      passwordResetToken:  tokenHash,
      passwordResetExpiry: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res.status(400).json({
        error: 'This reset link is invalid or has expired. Please request a new one.',
      });
    }

    // Update password and clear reset fields atomically
    user.passwordHash        = hashPassword(newPassword);
    user.passwordResetToken  = null;
    user.passwordResetExpiry = null;
    await user.save();

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password: ' + err.message });
  }
});

module.exports = router;
