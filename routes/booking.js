// ============================================================
//  Book Yo — booking requests and discovery-call scheduling
//  POST /api/bookings        full multi-step booking request
//  GET  /api/calls/slots     open discovery-call times
//  POST /api/calls           book a discovery call
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const { scoreLead, notifyBooking, queueEmail, syncCRM, SITE_URL, emailEnabled } = require('../lib/leads');

// ---- Availability rules (edit to match Yo's calendar) ----
const AVAIL = {
  timeZone: 'America/Los_Angeles',
  days: [2, 3, 4],                          // Tue, Wed, Thu (0 = Sunday)
  times: ['10:00', '11:00', '13:30', '15:00'],
  minNoticeHours: 24,
  daysAhead: 21,
  lengthMinutes: 30,
};

const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').toLowerCase());
const clean = (v, max = 500) => String(v ?? '').trim().slice(0, max);

// Small per-IP rate limit for public write routes
const hits = new Map();
const limited = (req, max = 8, windowMs = 10 * 60 * 1000) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '';
  const now = Date.now();
  const list = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  list.push(now); hits.set(ip, list);
  return list.length > max;
};

// Offset (minutes) of a time zone at a given instant, using Intl only
const tzOffset = (date, timeZone) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return (asUTC - date.getTime()) / 60000;
};
// Local wall time in `timeZone` → UTC Date (handles daylight saving)
const zoned = (y, m, d, hh, mm, timeZone) => {
  const guess = new Date(Date.UTC(y, m - 1, d, hh, mm));
  const off1 = tzOffset(guess, timeZone);
  const t = new Date(guess.getTime() - off1 * 60000);
  const off2 = tzOffset(t, timeZone);
  return off1 === off2 ? t : new Date(guess.getTime() - off2 * 60000);
};

// All slots in the window, as ISO strings (UTC)
function allSlots(now = new Date()) {
  const out = [];
  const earliest = now.getTime() + AVAIL.minNoticeHours * 3600000;
  for (let i = 0; i <= AVAIL.daysAhead; i++) {
    const day = new Date(now.getTime() + i * 86400000);
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: AVAIL.timeZone, year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(day).map((x) => [x.type, x.value]));
    const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(p.weekday);
    if (!AVAIL.days.includes(dow)) continue;
    for (const t of AVAIL.times) {
      const [hh, mm] = t.split(':').map(Number);
      const at = zoned(+p.year, +p.month, +p.day, hh, mm, AVAIL.timeZone);
      if (at.getTime() >= earliest) out.push(at.toISOString());
    }
  }
  return [...new Set(out)].sort();
}

// ---------------- POST /api/bookings ----------------
router.post('/bookings', (req, res) => {
  if (limited(req)) return res.status(429).json({ ok: false, message: 'Too many requests. Please try again in a few minutes.' });
  const b = req.body || {};
  if (b.website) return res.json({ ok: true, message: 'Thank you!' }); // honeypot: silently ignore bots
  if (b.elapsed !== undefined && Number(b.elapsed) < 3000) return res.status(400).json({ ok: false, message: 'Please take a moment to complete the form.' });
  const name = clean(b.name, 120), email = clean(b.email, 160).toLowerCase();
  if (!name) return res.status(400).json({ ok: false, message: 'Please add your name.' });
  if (!isEmail(email)) return res.status(400).json({ ok: false, message: 'Please add a valid email address.' });
  if (!b.consent) return res.status(400).json({ ok: false, message: 'Please agree to be contacted so we can reply.' });

  const fields = ['event_name', 'event_type', 'event_date', 'format', 'location', 'audience', 'topic', 'goals', 'budget', 'decision_maker', 'heard_from', 'phone', 'organization'];
  const details = Object.fromEntries(fields.map((k) => [k, clean(b[k])]));
  const score = scoreLead(details);
  const summary = [
    ['Event', details.event_name], ['Type', details.event_type], ['Date', details.event_date],
    ['Format', details.format], ['Location', details.location], ['Audience size', details.audience],
    ['Topic', details.topic], ['Budget', details.budget], ['Decision maker', details.decision_maker],
    ['Heard about us', details.heard_from], ['Goals', details.goals],
  ].filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');

  try {
    const { lastInsertRowid: id } = db.prepare(`
      INSERT INTO inquiries (name, email, phone, organization, inquiry_type, event_type, event_date, budget, message, score, details, source)
      VALUES (?, ?, ?, ?, 'Booking', ?, ?, ?, ?, ?, ?, ?)`).run(
      name, email, details.phone, details.organization, details.event_type, details.event_date, details.budget,
      summary || '(no details)', score, JSON.stringify(details), clean(b.source || 'book-form', 40));
    notifyBooking({ id, name, email, score, summary, talk: /^[a-z-]+$/.test(details.topic) ? details.topic : '' });
    syncCRM({ type: 'booking', id, name, email, score, tags: ['booking', b.source || 'book-form'], ...details });
    res.status(201).json({ ok: true, id, emailed: emailEnabled(), message: 'Request received.' });
  } catch (err) {
    console.error('[POST /bookings]', err.message);
    res.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
  }
});

// ---------------- GET /api/calls/slots ----------------
router.get('/calls/slots', (req, res) => {
  const taken = new Set(db.prepare(`SELECT starts_at FROM calls WHERE status = 'booked'`).all().map((r) => r.starts_at));
  const slots = allSlots().filter((s) => !taken.has(s));
  res.json({ ok: true, timeZone: AVAIL.timeZone, lengthMinutes: AVAIL.lengthMinutes, slots });
});

// ---------------- POST /api/calls ----------------
router.post('/calls', (req, res) => {
  if (limited(req, 5)) return res.status(429).json({ ok: false, message: 'Too many requests. Please try again in a few minutes.' });
  const { name, email, starts_at, inquiry_id } = req.body || {};
  if (!clean(name) || !isEmail(email)) return res.status(400).json({ ok: false, message: 'Name and a valid email are required.' });
  if (!allSlots().includes(starts_at)) return res.status(400).json({ ok: false, message: 'That time is no longer available. Please pick another.' });
  try {
    db.prepare(`INSERT INTO calls (name, email, inquiry_id, starts_at) VALUES (?, ?, ?, ?)`).run(clean(name, 120), clean(email, 160).toLowerCase(), Number(inquiry_id) || null, starts_at);
  } catch (err) {
    if (/UNIQUE/.test(err.message)) return res.status(409).json({ ok: false, message: 'Someone just booked that time. Please pick another.' });
    return res.status(500).json({ ok: false, message: 'Something went wrong. Please try again.' });
  }
  const when = new Date(starts_at).toLocaleString('en-US', { timeZone: AVAIL.timeZone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
  queueEmail({ to: clean(email, 160), kind: 'call', subject: `Your discovery call with Yo: ${when}`, body: `Hi ${clean(name, 120)},\n\nYour ${AVAIL.lengthMinutes}-minute discovery call is booked for ${when}.\n\nWe'll send a video link before the call. Need to change it? Just reply to this email.\n\nYo's one-sheet: ${SITE_URL}/press/one-sheet/\n\nThe Business of You team` });
  if (process.env.ALERT_EMAIL) queueEmail({ to: process.env.ALERT_EMAIL, kind: 'call', subject: `Discovery call booked: ${clean(name, 120)} · ${when}`, body: `${clean(name, 120)} <${clean(email, 160)}> booked a discovery call for ${when}.${inquiry_id ? ` Related inquiry #${inquiry_id}.` : ''}` });
  syncCRM({ type: 'discovery-call', name, email, starts_at, inquiry_id });
  res.status(201).json({ ok: true, when, emailed: emailEnabled(), message: `Booked for ${when}.` });
});

module.exports = router;
module.exports.allSlots = allSlots;
module.exports.AVAIL = AVAIL;
