const express = require('express');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const {
  createToken,
  normalizeEmail,
  requireAuth,
} = require('../auth');

const router = express.Router();

function sanitizeUser(user) {
  return {
    id:      user._id.toString(),
    email:   user.email,
    name:    user.name || '',
    picture: user.picture || '',
  };
}

// ── POST /api/auth/google ──────────────────────────────────────────────────────
router.post('/google', async (req, res) => {
  const credential = req.body.credential || req.body.token || req.body.idToken;

  if (!credential) {
    return res.status(400).json({ error: 'Google credential (ID token) is required' });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'Server misconfiguration: GOOGLE_CLIENT_ID not configured' });
  }

  try {
    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return res.status(400).json({ error: 'Invalid Google token payload' });
    }

    const { sub: googleId, email, name, picture } = payload;
    const normEmail = normalizeEmail(email);

    // 1. Look up by googleId first
    let user = await User.findOne({ googleId });

    // 2. Fallback: look up by email for existing users who signed up before Google OAuth migration
    if (!user && normEmail) {
      user = await User.findOne({ email: normEmail });
    }

    if (user) {
      let updated = false;
      if (!user.googleId) {
        user.googleId = googleId;
        updated = true;
      }
      if (name && user.name !== name) {
        user.name = name;
        updated = true;
      }
      if (picture && user.picture !== picture) {
        user.picture = picture;
        updated = true;
      }
      if (updated) {
        await user.save();
      }
    } else {
      user = await User.create({
        googleId,
        email: normEmail,
        name: name || '',
        picture: picture || '',
      });
    }

    const token = createToken(user._id.toString(), user.email);

    res.json({
      token,
      user: sanitizeUser(user),
    });
  } catch (error) {
    console.error('[auth/google] Error verifying Google token:', error.message);
    res.status(401).json({ error: 'Failed to authenticate with Google: ' + error.message });
  }
});

// ── GET /api/auth/me ───────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.json({ user: req.user });
    }
    res.json({ user: sanitizeUser(user) });
  } catch {
    res.json({ user: req.user });
  }
});

// ── POST /api/auth/logout ──────────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
