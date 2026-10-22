// ============================================================
//  DR. ABRAHAM — API Routes
//  File: routes/api.js
// ============================================================

const express = require('express');
const router  = express.Router();
const db      = require('../database/db');

// ── Helper: validate email ──────────────────────────────────
const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).toLowerCase());

// ── Log page view ───────────────────────────────────────────
const logView = (page, req) => {
  try {
    const raw = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
    const crypto = require('crypto');
    const ip_hash = crypto.createHash('sha256').update(raw).digest('hex').slice(0, 16);
    db.prepare(`INSERT INTO page_views (page, referrer, user_agent, ip_hash) VALUES (?, ?, ?, ?)`)
      .run(page, req.headers.referer || '', req.headers['user-agent'] || '', ip_hash);
  } catch (_) {}
};

// ============================================================
//  SUBSCRIBERS
// ============================================================

// POST /api/subscribers  — subscribe to newsletter
router.post('/subscribers', (req, res) => {
  const { email, first_name, source } = req.body;
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ ok: false, message: 'Please provide a valid email address.' });
  }
  try {
    const existing = db.prepare('SELECT id, status FROM subscribers WHERE email = ?').get(email.toLowerCase().trim());
    if (existing) {
      if (existing.status === 'unsubscribed') {
        db.prepare(`UPDATE subscribers SET status='active', updated_at=datetime('now') WHERE id=?`).run(existing.id);
        return res.json({ ok: true, message: 'Welcome back! You have been re-subscribed.' });
      }
      return res.json({ ok: true, message: 'You are already subscribed. Thank you!' });
    }
    db.prepare(`INSERT INTO subscribers (email, first_name, source) VALUES (?, ?, ?)`)
      .run(email.toLowerCase().trim(), first_name || '', source || 'website');
    return res.status(201).json({ ok: true, message: 'Thank you for subscribing! Check your inbox.' });
  } catch (err) {
    console.error('[POST /subscribers]', err.message);
    return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/subscribers  — list all (admin)
router.get('/subscribers', (req, res) => {
  try {
    const rows = db.prepare(`SELECT id, email, first_name, source, tags, status, created_at
                             FROM subscribers ORDER BY created_at DESC`).all();
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/subscribers/:id  — unsubscribe
router.delete('/subscribers/:id', (req, res) => {
  try {
    db.prepare(`UPDATE subscribers SET status='unsubscribed', updated_at=datetime('now') WHERE id=?`)
      .run(req.params.id);
    res.json({ ok: true, message: 'Unsubscribed successfully.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ============================================================
//  CONTACT / BOOKING INQUIRIES
// ============================================================

// POST /api/inquiries
router.post('/inquiries', (req, res) => {
  const { name, email, phone, organization, inquiry_type, event_type, event_date, budget, message } = req.body;
  if (!name || !name.trim())        return res.status(400).json({ ok: false, message: 'Name is required.' });
  if (!email || !isValidEmail(email)) return res.status(400).json({ ok: false, message: 'Valid email is required.' });
  if (!message || !message.trim())  return res.status(400).json({ ok: false, message: 'Message is required.' });

  try {
    const result = db.prepare(`
      INSERT INTO inquiries (name, email, phone, organization, inquiry_type, event_type, event_date, budget, message)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      name.trim(), email.toLowerCase().trim(), phone || '', organization || '',
      inquiry_type || '', event_type || '', event_date || '', budget || '', message.trim()
    );
    res.status(201).json({ ok: true, message: 'Your inquiry has been received. We will be in touch within 1 business day.', id: result.lastInsertRowid });
  } catch (err) {
    console.error('[POST /inquiries]', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
  }
});

// GET /api/inquiries  — list all
router.get('/inquiries', (req, res) => {
  try {
    const { status } = req.query;
    const sql = status
      ? `SELECT * FROM inquiries WHERE status=? ORDER BY created_at DESC`
      : `SELECT * FROM inquiries ORDER BY created_at DESC`;
    const rows = status ? db.prepare(sql).all(status) : db.prepare(sql).all();
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PATCH /api/inquiries/:id/status
router.patch('/inquiries/:id/status', (req, res) => {
  const { status } = req.body;
  const allowed = ['new', 'read', 'replied', 'closed'];
  if (!allowed.includes(status)) return res.status(400).json({ ok: false, message: 'Invalid status.' });
  try {
    db.prepare(`UPDATE inquiries SET status=? WHERE id=?`).run(status, req.params.id);
    res.json({ ok: true, message: 'Status updated.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ============================================================
//  BLOG POSTS
// ============================================================

// GET /api/posts  — list published posts
router.get('/posts', (req, res) => {
  try {
    const { category, limit = 10, offset = 0, search } = req.query;
    let sql = `SELECT id, title, slug, excerpt, category, image_url, author, read_time, views, created_at
               FROM posts WHERE status='published'`;
    const params = [];
    if (category && category !== 'all') { sql += ` AND category=?`; params.push(category); }
    if (search) { sql += ` AND (title LIKE ? OR excerpt LIKE ?)`; params.push(`%${search}%`, `%${search}%`); }
    sql += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(Number(limit), Number(offset));
    const rows = db.prepare(sql).all(...params);
    const totalRes = db.prepare(`SELECT COUNT(*) as total FROM posts WHERE status='published'`).get();
    res.json({ ok: true, total: totalRes.total, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/posts/:slug  — single post
router.get('/posts/:slug', (req, res) => {
  try {
    const post = db.prepare(`SELECT * FROM posts WHERE slug=? AND status='published'`).get(req.params.slug);
    if (!post) return res.status(404).json({ ok: false, message: 'Post not found.' });
    db.prepare(`UPDATE posts SET views = views + 1 WHERE id=?`).run(post.id);
    logView(`/blog/${req.params.slug}`, req);
    res.json({ ok: true, data: post });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/posts  — create post
router.post('/posts', (req, res) => {
  const { title, slug, excerpt, content, category, image_url, read_time, status } = req.body;
  if (!title || !slug) return res.status(400).json({ ok: false, message: 'Title and slug are required.' });
  try {
    const result = db.prepare(`
      INSERT INTO posts (title, slug, excerpt, content, category, image_url, read_time, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, slug, excerpt || '', content || '', category || 'mindset', image_url || '', read_time || 5, status || 'published');
    res.status(201).json({ ok: true, id: result.lastInsertRowid });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ ok: false, message: 'A post with that slug already exists.' });
    res.status(500).json({ ok: false, message: err.message });
  }
});

// PUT /api/posts/:id  — update post
router.put('/posts/:id', (req, res) => {
  const { title, slug, excerpt, content, category, image_url, read_time, status } = req.body;
  try {
    db.prepare(`UPDATE posts SET title=?, slug=?, excerpt=?, content=?, category=?, image_url=?,
                read_time=?, status=?, updated_at=datetime('now') WHERE id=?`)
      .run(title, slug, excerpt, content, category, image_url, read_time, status, req.params.id);
    res.json({ ok: true, message: 'Post updated.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// DELETE /api/posts/:id
router.delete('/posts/:id', (req, res) => {
  try {
    db.prepare(`DELETE FROM posts WHERE id=?`).run(req.params.id);
    res.json({ ok: true, message: 'Post deleted.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ============================================================
//  TESTIMONIALS
// ============================================================

// GET /api/testimonials
router.get('/testimonials', (req, res) => {
  try {
    const { featured } = req.query;
    const sql = featured
      ? `SELECT * FROM testimonials WHERE approved=1 AND featured=1 ORDER BY created_at DESC`
      : `SELECT * FROM testimonials WHERE approved=1 ORDER BY created_at DESC`;
    const rows = db.prepare(sql).all();
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// POST /api/testimonials
router.post('/testimonials', (req, res) => {
  const { name, role, location, program, result, content, rating } = req.body;
  if (!name || !content) return res.status(400).json({ ok: false, message: 'Name and content are required.' });
  try {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    db.prepare(`INSERT INTO testimonials (name, role, location, program, result, content, rating, initials, approved)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`)
      .run(name, role || '', location || '', program || '', result || '', content, rating || 5, initials);
    res.status(201).json({ ok: true, message: 'Testimonial submitted for review.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ============================================================
//  PROGRAM LEADS
// ============================================================

// POST /api/leads
router.post('/leads', (req, res) => {
  const { name, email, phone, program, revenue, goal } = req.body;
  if (!name || !email || !program) return res.status(400).json({ ok: false, message: 'Name, email, and program are required.' });
  if (!isValidEmail(email)) return res.status(400).json({ ok: false, message: 'Valid email required.' });
  try {
    db.prepare(`INSERT INTO program_leads (name, email, phone, program, revenue, goal) VALUES (?, ?, ?, ?, ?, ?)`)
      .run(name, email.toLowerCase().trim(), phone || '', program, revenue || '', goal || '');
    res.status(201).json({ ok: true, message: 'Application received! We will contact you within 48 hours.' });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// GET /api/leads
router.get('/leads', (req, res) => {
  try {
    const rows = db.prepare(`SELECT * FROM program_leads ORDER BY created_at DESC`).all();
    res.json({ ok: true, count: rows.length, data: rows });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// ============================================================
//  ANALYTICS / DASHBOARD STATS
// ============================================================

router.get('/stats', (req, res) => {
  try {
    const stats = {
      subscribers:  db.prepare(`SELECT COUNT(*) as n FROM subscribers WHERE status='active'`).get().n,
      inquiries:    db.prepare(`SELECT COUNT(*) as n FROM inquiries WHERE status='new'`).get().n,
      leads:        db.prepare(`SELECT COUNT(*) as n FROM program_leads WHERE status='pending'`).get().n,
      posts:        db.prepare(`SELECT COUNT(*) as n FROM posts WHERE status='published'`).get().n,
      total_views:  db.prepare(`SELECT COUNT(*) as n FROM page_views`).get().n,
      today_views:  db.prepare(`SELECT COUNT(*) as n FROM page_views WHERE DATE(created_at)=DATE('now')`).get().n,
      testimonials: db.prepare(`SELECT COUNT(*) as n FROM testimonials WHERE approved=1`).get().n,
    };
    const recent_inquiries = db.prepare(`SELECT name, email, inquiry_type, created_at FROM inquiries ORDER BY created_at DESC LIMIT 5`).all();
    const recent_subscribers = db.prepare(`SELECT email, source, created_at FROM subscribers ORDER BY created_at DESC LIMIT 5`).all();
    const top_posts = db.prepare(`SELECT title, slug, views FROM posts ORDER BY views DESC LIMIT 5`).all();
    res.json({ ok: true, stats, recent_inquiries, recent_subscribers, top_posts });
  } catch (err) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Track page view
router.post('/track', (req, res) => {
  const { page } = req.body;
  if (page) logView(page, req);
  res.json({ ok: true });
});

module.exports = router;
