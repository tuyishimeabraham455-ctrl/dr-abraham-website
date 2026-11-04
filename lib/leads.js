// ============================================================
//  Lead scoring, notification outbox and CRM sync
//  Used by booking routes and Agent Yo.
//
//  Environment variables (all optional):
//    RESEND_API_KEY   send queued emails through resend.com
//    MAIL_FROM        sender, e.g. "Yo <hello@yourdomain.com>"
//    ALERT_EMAIL      where hot-lead alerts go (Yo's inbox)
//    CRM_WEBHOOK_URL  POST every lead as JSON (Zapier, Make, HubSpot, Airtable…)
//    SITE_URL         public site address, used for links in emails
// ============================================================
const db = require('../database/db');

const SITE_URL = (process.env.SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

/**
 * Score a lead 0-100 from the blueprint's signals:
 * event date, budget, audience size and decision-maker status.
 */
function scoreLead({ event_date, budget = '', audience = '', decision_maker = '', organization = '' } = {}) {
  let score = 0;
  // Event date: real dates 3 weeks to 9 months out are the strongest
  const t = Date.parse(event_date);
  if (!Number.isNaN(t)) {
    const days = (t - Date.now()) / 86400000;
    if (days >= 21 && days <= 270) score += 25;
    else if (days > 0) score += 12;
  } else if (event_date) score += 6;
  // Budget band
  if (/10,?000\+|10k\+/i.test(budget)) score += 30;
  else if (/5,?000 to/i.test(budget)) score += 24;
  else if (/2,?500 to/i.test(budget)) score += 16;
  else if (/under/i.test(budget)) score += 6;
  // Audience size
  if (/500\+/.test(audience)) score += 20;
  else if (/200 to 500/.test(audience)) score += 16;
  else if (/50 to 200/.test(audience)) score += 10;
  else if (audience) score += 4;
  // Decision maker
  if (/yes|i decide|decision/i.test(decision_maker)) score += 15;
  else if (/part|committee|recommend/i.test(decision_maker)) score += 8;
  if (organization) score += 10;
  return Math.min(100, score);
}

const HOT = 60;

/** True when real email sending is configured (otherwise emails wait in the outbox). */
const emailEnabled = () => Boolean(process.env.RESEND_API_KEY && process.env.MAIL_FROM);

/** Queue an email; send it right away if an email service is configured. */
function queueEmail({ to, subject, body, kind }) {
  if (!to) return null;
  const { lastInsertRowid: id } = db.prepare(`INSERT INTO outbox (to_email, subject, body, kind) VALUES (?, ?, ?, ?)`).run(to, subject, body, kind || '');
  sendQueued(id).catch(() => {});
  return id;
}

async function sendQueued(id) {
  const key = process.env.RESEND_API_KEY, from = process.env.MAIL_FROM;
  if (!key || !from) return; // stays "queued" and visible in the dashboard
  const m = db.prepare(`SELECT * FROM outbox WHERE id = ?`).get(id);
  if (!m || m.status === 'sent') return;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [m.to_email], subject: m.subject, text: m.body }),
    });
    if (!res.ok) throw new Error(`Email service returned ${res.status}`);
    db.prepare(`UPDATE outbox SET status = 'sent', sent_at = datetime('now'), error = NULL WHERE id = ?`).run(id);
  } catch (err) {
    db.prepare(`UPDATE outbox SET status = 'failed', error = ? WHERE id = ?`).run(String(err.message).slice(0, 300), id);
  }
}

/** Send a lead to the CRM webhook, tagged by source/mode. Never throws. */
async function syncCRM(payload) {
  const url = process.env.CRM_WEBHOOK_URL;
  if (!url) return;
  try {
    await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payload, sent_at: new Date().toISOString() }) });
  } catch (err) {
    console.warn('[CRM] webhook failed:', err.message);
  }
}

/** Confirmation to the requester + alert to Yo for hot leads. */
function notifyBooking({ id, name, email, score, summary, talk }) {
  const oneSheet = `${SITE_URL}/press/one-sheet/`;
  queueEmail({
    to: email,
    kind: 'confirmation',
    subject: 'We received your request | The Business of You',
    body: `Hi ${name},\n\nThank you for reaching out to book Yolanda "Yo" Butler. We received your request and will reply within one business day.\n\nYour details:\n${summary}\n\nYo's one-sheet, with bio, topics and photos: ${oneSheet}\n${talk ? `The talk you asked about: ${SITE_URL}/speaking/${talk}/\n` : ''}\nWarmly,\nThe Business of You team`,
  });
  if (score >= HOT && process.env.ALERT_EMAIL) {
    queueEmail({ to: process.env.ALERT_EMAIL, kind: 'hot-lead', subject: `Hot lead (${score}/100): ${name}`, body: `A high-intent booking request just came in (inquiry #${id}).\n\n${summary}\n\nReply within the hour while it's warm.` });
  }
}

module.exports = { emailEnabled, scoreLead, queueEmail, sendQueued, syncCRM, notifyBooking, HOT, SITE_URL };
