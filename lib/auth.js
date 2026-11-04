// ============================================================
//  Admin protection shared by every admin-only route.
//  Admin routes require the X-Admin-Token header to match ADMIN_TOKEN.
// ============================================================
const crypto = require('crypto');

const requireAdmin = (req, res, next) => {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    // No token configured: allow locally, refuse in production
    if (process.env.NODE_ENV !== 'production') return next();
    return res.status(503).json({ ok: false, message: 'ADMIN_TOKEN is not configured on the server.' });
  }
  const given = String(req.get('x-admin-token') || '');
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false, message: 'Unauthorized.' });
  next();
};

module.exports = { requireAdmin };
