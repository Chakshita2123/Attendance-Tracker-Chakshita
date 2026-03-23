const crypto = require('crypto');
const prisma = require('./db');

const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30;

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;

  const [salt, originalHash] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  const originalBuffer = Buffer.from(originalHash, 'hex');
  const candidateBuffer = Buffer.from(derivedKey, 'hex');

  return (
    originalBuffer.length === candidateBuffer.length &&
    crypto.timingSafeEqual(originalBuffer, candidateBuffer)
  );
}

function createSessionToken() {
  return crypto.randomBytes(32).toString('base64url');
}

function readBearerToken(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice(7).trim() || null;
}

async function createSession(userId) {
  const token = createSessionToken();
  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_TTL_MS),
    },
  });

  return token;
}

async function requireAuth(req, res, next) {
  const token = readBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  try {
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session) {
      return res.status(401).json({ error: 'Invalid auth token' });
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.delete({ where: { id: session.id } });
      return res.status(401).json({ error: 'Session expired' });
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
    };
    req.session = {
      id: session.id,
      tokenHash: session.tokenHash,
    };

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify auth token: ' + error.message });
  }
}

module.exports = {
  createSession,
  hashPassword,
  normalizeEmail,
  readBearerToken,
  requireAuth,
  verifyPassword,
};
