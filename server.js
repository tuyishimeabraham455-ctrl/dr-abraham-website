// ============================================================
//  DR. ABRAHAM — Express Server
//  File: server.js
//  Run: node server.js
// ============================================================

const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Request logger ───────────────────────────────────────────
app.use((req, res, next) => {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  console.log(`[${now}]  ${req.method.padEnd(6)} ${req.url}`);
  next();
});

// ── Serve static files (CSS, JS, images) ────────────────────
app.use(express.static(path.join(__dirname), {
  index: false,   // we handle index manually
  extensions: ['html']
}));

// ── REST API ─────────────────────────────────────────────────
const apiRouter = require('./routes/api');
app.use('/api', apiRouter);

// ── Admin dashboard ──────────────────────────────────────────
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ── HTML page routes ─────────────────────────────────────────
const pages = {
  '/':          'index.html',
  '/about':     'about.html',
  '/programs':  'programs.html',
  '/book':      'book.html',
  '/blog':      'blog.html',
  '/contact':   'contact.html',
};

Object.entries(pages).forEach(([route, file]) => {
  app.get(route, (req, res) => {
    res.sendFile(path.join(__dirname, file));
  });
});

// Also serve .html extensions via static middleware above

// ── 404 fallback ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, 'index.html'));
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
  console.log('   DR. ABRAHAM — Website Server');
  console.log('  =================================================');
  console.log(`   Local:    http://localhost:${PORT}`);
  console.log(`   Admin:    http://localhost:${PORT}/admin`);
  console.log(`   API:      http://localhost:${PORT}/api/stats`);
  console.log('  =================================================');
  console.log('');
});
