// ============================================================
//  Member accounts: password hashing, sessions, role checks
//  Roles: admin (everything) · team (CRM + content) · member (portal)
// ============================================================
const crypto = require('crypto');
const db = require('../database/db');

const ROLES = ['admin', 'team', 'member'];

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${salt}:${hash}`;
};
const checkPassword = (password, stored) => {
  const [salt, hash] = String(stored).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(String(password), salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');
// Readable one-time password, e.g. for new accounts and resets
const tempPassword = () => crypto.randomBytes(9).toString('base64url');

const tokenFrom = (req) => String(req.get('authorization') || '').replace(/^Bearer\s+/i, '');

const memberFromRequest = (req) => {
  const token = tokenFrom(req);
  if (!token) return null;
  return db.prepare(`
    SELECT m.id, m.name, m.email, m.programs, m.status, COALESCE(m.role, 'member') AS role
    FROM member_sessions s JOIN members m ON m.id = s.member_id
    WHERE s.token_hash = ? AND s.expires_at > datetime('now') AND m.status = 'active'
  `).get(sha256(token)) || null;
};

const startSession = (memberId) => {
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare(`INSERT INTO member_sessions (token_hash, member_id, expires_at) VALUES (?, ?, datetime('now', '+14 days'))`).run(sha256(token), memberId);
  db.prepare(`DELETE FROM member_sessions WHERE expires_at <= datetime('now')`).run();
  return token;
};

/** Express middleware: require a signed-in member, optionally with one of `roles`. */
const requireMember = (...roles) => (req, res, next) => {
  const m = memberFromRequest(req);
  if (!m) return res.status(401).json({ ok: false, message: 'Please log in.' });
  if (roles.length && !roles.includes(m.role)) return res.status(403).json({ ok: false, message: 'You don\'t have access to this.' });
  req.member = m;
  next();
};

const publicMember = (m) => ({ id: m.id, name: m.name, email: m.email, role: m.role || 'member', programs: m.programs || '' });

module.exports = { ROLES, hashPassword, checkPassword, sha256, tempPassword, tokenFrom, memberFromRequest, startSession, requireMember, publicMember };
