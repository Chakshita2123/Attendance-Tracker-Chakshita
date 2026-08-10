const jwt = require('jsonwebtoken');

// ── JWT ──────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '30d';

if (!JWT_SECRET) {
  // Warn rather than crash so `node --check` still passes; the actual
  // runtime error will fire on the first createToken() call.
  console.warn('[auth] WARNING: JWT_SECRET is not set in environment variables');
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

// ── Token creation (replaces createSession) ──────────────────────────────────

/**
 * Signs and returns a JWT containing { sub: userId, email }.
 * The frontend stores this in localStorage and sends it as a Bearer token.
 * No server-side session record is created.
 */
function createToken(userId, email) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET is not set');
  return jwt.sign({ sub: userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ── Request middleware ────────────────────────────────────────────────────────

function readBearerToken(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

/**
 * Express middleware — verifies the JWT and populates req.user.
 * Pure stateless: no DB lookup needed (user id and email are in the token).
 */
function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  if (!JWT_SECRET) {
    return res.status(500).json({ error: 'Server misconfiguration: JWT_SECRET not set' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = {
      id:    payload.sub,
      email: payload.email,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired' });
    }
    return res.status(401).json({ error: 'Invalid auth token' });
  }
}

module.exports = {
  createToken,
  normalizeEmail,
  readBearerToken,
  requireAuth,
};

