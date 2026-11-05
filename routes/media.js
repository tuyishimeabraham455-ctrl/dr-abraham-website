// ============================================================
//  MEDIA + PAGE EDITING (admin)
//  Public
//    GET  /api/media?kind=video|photo&on=watch|about   library items
//    GET  /api/content?path=/about/                    page edits
//  Admin
//    POST   /api/portal/uploads?kind=photos|videos     upload a file (body = file)
//    GET    /api/portal/media                          everything in the library
//    POST   /api/portal/media                          add a video or photo
//    PATCH  /api/portal/media/:id                      edit / reorder
//    DELETE /api/portal/media/:id
//    PUT    /api/portal/content                        save page edits (or reset a page)
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const m = require('../lib/members');
const { saveUpload, removeUpload } = require('../lib/uploads');
const { classifyVideo, probeVideo } = require('../lib/settings');

const admin = m.requireMember('admin');
const clean = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const id = (v) => Number.parseInt(v, 10) || 0;
const bad = (res, msg, code = 400) => res.status(code).json({ ok: false, message: msg });
const PLACES = ['watch', 'about', 'books', 'podcast'];
const { episodes: EPISODES } = require('../site/content/podcast');
const isPhoto = (u) => /^\/uploads\/photos\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(u) || /^https:\/\/[^\s<>"']+$/.test(u);

// Only a few inline tags survive in edited text; everything else is removed
const ALLOWED = new Set(['em', 'strong', 'b', 'i', 'br']);
const sanitizeText = (html) => String(html || '')
  .replace(/<(script|style|iframe|object|embed|svg|math)[\s\S]*?<\/\1\s*>/gi, '')
  .replace(/<\/?([a-z0-9]+)\b[^>]*>/gi, (tag, name) => (ALLOWED.has(name.toLowerCase()) ? (tag.startsWith('</') ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`) : ''))
  .replace(/&(?!(amp|lt|gt|quot|#39|nbsp|#\d+);)/g, '&amp;')
  .slice(0, 6000);

// What the website needs to show a library item
const publicItem = (r) => {
  const video = r.kind === 'video' ? (classifyVideo(r.src) || (r.src_type === 'file' ? { kind: 'file', src: r.src } : null)) : null;
  let thumb = r.thumb;
  if (!thumb && video && video.kind === 'youtube') thumb = `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`;
  return { id: r.id, kind: r.kind, title: r.title, description: r.description, category: r.category, featured: !!r.featured, show_on: r.show_on.split(',').filter(Boolean), src: r.kind === 'photo' || r.kind === 'audio' ? r.src : undefined, link: r.kind === 'book' ? r.src : undefined, video, thumb };
};

router.get('/media', (req, res) => {
  const kind = ['video', 'photo', 'book', 'audio'].includes(req.query.kind) ? req.query.kind : null;
  const on = PLACES.includes(req.query.on) ? req.query.on : null;
  const rows = db.prepare(`SELECT * FROM media_items WHERE (? IS NULL OR kind = ?) ORDER BY featured DESC, sort, id DESC`).all(kind, kind)
    .filter((r) => !on || r.show_on.split(',').includes(on));
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, data: rows.map(publicItem).filter((r) => r.kind !== 'video' || r.video) });
});

// Episode list for the admin's podcast audio form
router.get('/podcast/episodes', (req, res) => res.json({ ok: true, data: EPISODES.map((e) => ({ n: e.n, slug: e.slug, title: e.title })) }));

router.get('/content', (req, res) => {
  const path = clean(req.query.path, 300);
  const rows = db.prepare(`SELECT key, kind, value FROM site_content WHERE path = ?`).all(path);
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, data: Object.fromEntries(rows.map((r) => [r.key, { kind: r.kind, value: r.value }])) });
});

// ---------------- Admin ----------------
router.post('/portal/uploads', admin, async (req, res) => {
  const kind = ['photos', 'videos', 'audio'].includes(req.query.kind) ? req.query.kind : null;
  if (!kind) return bad(res, 'Choose a photo, video or audio file.');
  try { const { url, warning, converted } = await saveUpload(req, kind); res.status(201).json({ ok: true, url, warning, converted }); }
  catch (err) { res.status(err.status || 500).json({ ok: false, message: err.message || 'Upload failed.' }); }
});

router.get('/portal/media', admin, (req, res) => {
  const rows = db.prepare(`SELECT * FROM media_items ORDER BY kind DESC, featured DESC, sort, id DESC`).all();
  res.json({ ok: true, data: rows.map((r) => ({ ...publicItem(r), raw_src: r.src, raw_thumb: r.thumb, sort: r.sort })) });
});

async function readItem(b, existing) {
  const kind = existing ? existing.kind : (['video', 'photo', 'book', 'audio'].includes(b.kind) ? b.kind : null);
  if (!kind) throw { message: 'Choose video or photo.' };
  const out = {
    kind,
    title: b.title !== undefined ? clean(b.title, 160) : existing?.title || '',
    description: b.description !== undefined ? clean(b.description, 2000) : existing?.description || '',
    category: b.category !== undefined ? clean(b.category, 60) : existing?.category || '',
    src: existing?.src || '', src_type: existing?.src_type || '', thumb: existing?.thumb || '',
    show_on: existing?.show_on ?? 'watch',
    featured: b.featured !== undefined ? (b.featured ? 1 : 0) : existing?.featured || 0,
    sort: b.sort !== undefined ? id(b.sort) : existing?.sort || 0,
  };
  if (b.show_on !== undefined) out.show_on = (Array.isArray(b.show_on) ? b.show_on : String(b.show_on).split(',')).map((x) => String(x).trim()).filter((x) => PLACES.includes(x)).join(',');
  if (b.src !== undefined) {
    const src = clean(b.src, 600);
    if (kind === 'audio') {
      // Podcast episode audio: an uploaded file or a link to the audio (e.g. from a podcast host)
      if (!/^\/uploads\/audio\/[a-f0-9]{24}\.(mp3|mp4|wav|ogg|webm)$/.test(src) && !/^https:\/\/[^\s<>"']+$/.test(src)) throw { message: 'Upload the audio file, or use a link that starts with https://' };
      out.src = src;
    } else if (kind === 'book') {
      // A book's link is where to get it (bookshop, Amazon, Yo's own page); optional
      if (src && !/^(https:\/\/|\/)[^\s<>"']+$/.test(src)) throw { message: 'The book link should start with https://' };
      out.src = src;
    } else if (kind === 'photo') {
      if (!isPhoto(src)) throw { message: 'Upload a photo, or use a link that starts with https://' };
      out.src = src;
    } else {
      const known = classifyVideo(src);
      if (known) { out.src = src; out.src_type = ''; }
      else if (known === undefined && /^https?:\/\//i.test(src) && await probeVideo(src)) { out.src = src; out.src_type = 'file'; }
      else throw { message: 'That link isn\'t a video we can play. Use a YouTube or Vimeo link, a direct .mp4/.webm link, or upload the video.' };
    }
  }
  if (b.thumb !== undefined) {
    const t = clean(b.thumb, 600);
    if (t && !isPhoto(t)) throw { message: 'The cover photo should be uploaded, or a link starting with https://' };
    out.thumb = t;
  }
  if (kind === 'book') { if (!out.title) throw { message: 'Give the book a title.' }; return out; }
  if (kind === 'audio' && !EPISODES.some((e) => e.slug === out.category)) throw { message: 'Choose which episode this audio is for.' };
  if (!out.src) throw { message: kind === 'photo' ? 'Add the photo.' : 'Add the video link or upload the video.' };
  if (kind === 'video' && !out.title) throw { message: 'Give the video a title.' };
  return out;
}

router.post('/portal/media', admin, async (req, res) => {
  try {
    const it = await readItem(req.body || {});
    if (it.featured && it.kind === 'video') db.prepare(`UPDATE media_items SET featured = 0 WHERE kind = 'video'`).run();
    const { lastInsertRowid } = db.prepare(`INSERT INTO media_items (kind, title, description, category, src, src_type, thumb, show_on, featured, sort) VALUES (@kind, @title, @description, @category, @src, @src_type, @thumb, @show_on, @featured, @sort)`).run(it);
    res.status(201).json({ ok: true, id: lastInsertRowid, message: it.kind === 'photo' ? 'Photo added.' : it.kind === 'book' ? 'Book added.' : 'Video added.' });
  } catch (err) { bad(res, err.message || 'Could not save.'); }
});

router.patch('/portal/media/:id', admin, async (req, res) => {
  const row = db.prepare(`SELECT * FROM media_items WHERE id = ?`).get(id(req.params.id));
  if (!row) return bad(res, 'Not found.', 404);
  try {
    const it = await readItem(req.body || {}, row);
    if (it.featured && !row.featured && it.kind === 'video') db.prepare(`UPDATE media_items SET featured = 0 WHERE kind = 'video'`).run();
    db.prepare(`UPDATE media_items SET title = @title, description = @description, category = @category, src = @src, src_type = @src_type, thumb = @thumb, show_on = @show_on, featured = @featured, sort = @sort WHERE id = @id`).run({ ...it, id: row.id });
    if (row.src !== it.src) removeUpload(row.src);
    if (row.thumb !== it.thumb) removeUpload(row.thumb);
    res.json({ ok: true, message: 'Saved.' });
  } catch (err) { bad(res, err.message || 'Could not save.'); }
});

router.delete('/portal/media/:id', admin, (req, res) => {
  const row = db.prepare(`SELECT * FROM media_items WHERE id = ?`).get(id(req.params.id));
  if (!row) return bad(res, 'Not found.', 404);
  db.prepare(`DELETE FROM media_items WHERE id = ?`).run(row.id);
  removeUpload(row.src); removeUpload(row.thumb);
  res.json({ ok: true, message: 'Removed.' });
});

// Page edits: { path, items: [{ key, kind: 'text'|'image', value }] } or { path, reset: true }
router.put('/portal/content', admin, (req, res) => {
  const path = clean(req.body?.path, 300);
  if (!/^\/[\w\-./]*$/.test(path)) return bad(res, 'Unknown page.');
  if (req.body?.reset) {
    const old = db.prepare(`SELECT value FROM site_content WHERE path = ? AND kind = 'image'`).all(path);
    db.prepare(`DELETE FROM site_content WHERE path = ?`).run(path);
    old.forEach((r) => removeUpload(r.value));
    return res.json({ ok: true, message: 'This page is back to its original words and photos.' });
  }
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 300) : [];
  const up = db.prepare(`INSERT INTO site_content (path, key, kind, value, updated_at) VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(path, key) DO UPDATE SET kind = excluded.kind, value = excluded.value, updated_at = excluded.updated_at`);
  const del = db.prepare(`DELETE FROM site_content WHERE path = ? AND key = ?`);
  let saved = 0;
  try {
    db.transaction(() => {
      for (const it of items) {
        const key = clean(it.key, 200);
        if (!key) continue;
        if (it.revert) { del.run(path, key); saved++; continue; }
        if (it.kind === 'text') { up.run(path, key, 'text', sanitizeText(it.value)); saved++; }
        else if (it.kind === 'image') {
          const v = clean(it.value, 600);
          if (!isPhoto(v)) throw { message: 'A photo on this page has an unsafe link.' };
          up.run(path, key, 'image', v); saved++;
        }
      }
    })();
  } catch (err) { return bad(res, err.message || 'Could not save.'); }
  res.json({ ok: true, saved, message: `Saved ${saved} change${saved === 1 ? '' : 's'}. Everyone sees them now.` });
});

module.exports = router;
module.exports.sanitizeText = sanitizeText;
