// ============================================================
//  Yo | The Business of You — Express server
//  Run: node site/build.js && node server.js
//  Serves the built site (docs/), the REST API and the admin dashboard.
// ============================================================

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;
const SITE = path.join(__dirname, 'docs');

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Basic security headers
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'SAMEORIGIN',
  });
  next();
});

// ── Request logger ───────────────────────────────────────────
app.use((req, res, next) => {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}]  ${req.method.padEnd(6)} ${req.url}`);
  next();
});

// ── REST API ─────────────────────────────────────────────────
app.use('/api', require('./routes/api'));

// ── Admin dashboard ──────────────────────────────────────────
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'admin', 'index.html')));

// ── Previous one-page concept demo, kept for reference ──────
app.get('/concept-demo', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// ── The website: only the built docs/ folder is public ──────
// (Never serve the project root: it holds the database and source.)
if (!fs.existsSync(path.join(SITE, 'index.html'))) {
  console.warn('  ! docs/ is empty. Run "node site/build.js" first.');
}
app.use(express.static(SITE, { extensions: ['html'], maxAge: '1h' }));

// ── 404 ──────────────────────────────────────────────────────
app.use((req, res) => {
  const notFound = path.join(SITE, '404.html');
  res.status(404).sendFile(fs.existsSync(notFound) ? notFound : path.join(SITE, 'index.html'));
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  res.status(500).json({ ok: false, message: 'Internal server error.' });
});

// ── Start server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log('');
  console.log('  =================================================');
  console.log('   Yo | The Business of You');
  console.log('  =================================================');
  console.log(`   Site:     http://localhost:${PORT}`);
  console.log(`   Admin:    http://localhost:${PORT}/admin`);
  console.log('  =================================================');
  console.log('');
});
