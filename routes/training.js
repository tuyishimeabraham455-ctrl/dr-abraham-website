// ============================================================
//  TRAIN AGENT YO (portal, admin and team) — no AI service needed
//  GET    /api/portal/training          taught answers + unanswered questions
//  POST   /api/portal/training          teach an answer
//  PATCH  /api/portal/training/:id      edit
//  DELETE /api/portal/training/:id
//  POST   /api/portal/training/try      ask the local brain, see where the answer came from
//  DELETE /api/portal/training/gaps     clear an unanswered question once handled
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const m = require('../lib/members');
const brain = require('../lib/local-agent');

const staff = m.requireMember('admin', 'team');
const clean = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const id = (v) => Number.parseInt(v, 10) || 0;
const bad = (res, msg, code = 400) => res.status(code).json({ ok: false, message: msg });
const SOURCES = { taught: 'An answer you taught', faq: 'A FAQ on the website', search: 'Found on a page of the website', unknown: 'Not known yet' };
const sourceLabel = (s) => SOURCES[s] || (s.startsWith('skill:') ? `Built-in knowledge (${s.slice(6)})` : s.startsWith('talk:') ? 'Talk details' : s.startsWith('program:') ? 'Program details' : s);

function readBody(b) {
  const questions = clean(b.questions, 4000).split('\n').map((q) => q.trim()).filter(Boolean).slice(0, 30);
  const answer = clean(b.answer, 3000);
  const link = clean(b.link, 300);
  if (!questions.length) throw { message: 'Add at least one way people might ask this.' };
  if (!answer) throw { message: 'Write the answer Agent Yo should give.' };
  if (link && !/^(\/[^\s<>"']*|https:\/\/[^\s<>"']+)$/.test(link)) throw { message: 'The link should be a page on the site (like /book/) or start with https://' };
  return { questions: questions.join('\n'), answer, link, link_label: clean(b.link_label, 60) };
}

router.get('/portal/training', staff, (req, res) => {
  const taught = db.prepare(`SELECT * FROM agent_training ORDER BY updated_at DESC, id DESC`).all();
  const gaps = db.prepare(`SELECT question, COUNT(*) times, MAX(created_at) last FROM agent_gaps GROUP BY lower(trim(question)) ORDER BY last DESC LIMIT 50`).all();
  res.json({ ok: true, taught, gaps });
});

router.post('/portal/training', staff, (req, res) => {
  try {
    const t = readBody(req.body || {});
    const { lastInsertRowid } = db.prepare(`INSERT INTO agent_training (questions, answer, link, link_label) VALUES (@questions, @answer, @link, @link_label)`).run(t);
    // the questions it now knows are no longer gaps
    t.questions.split('\n').forEach((q) => db.prepare(`DELETE FROM agent_gaps WHERE lower(trim(question)) = lower(trim(?))`).run(q));
    brain.refreshTraining();
    res.status(201).json({ ok: true, id: lastInsertRowid, message: 'Taught. Agent Yo uses this answer right away.' });
  } catch (err) { bad(res, err.message || 'Could not save.'); }
});

router.delete('/portal/training/gaps', staff, (req, res) => {
  const q = clean(req.body?.question, 600);
  db.prepare(`DELETE FROM agent_gaps WHERE lower(trim(question)) = lower(trim(?))`).run(q);
  res.json({ ok: true });
});

router.patch('/portal/training/:id', staff, (req, res) => {
  const row = db.prepare(`SELECT * FROM agent_training WHERE id = ?`).get(id(req.params.id));
  if (!row) return bad(res, 'Not found.', 404);
  try {
    const t = readBody({ ...row, ...req.body });
    db.prepare(`UPDATE agent_training SET questions = @questions, answer = @answer, link = @link, link_label = @link_label, updated_at = datetime('now') WHERE id = @id`).run({ ...t, id: row.id });
    brain.refreshTraining();
    res.json({ ok: true, message: 'Saved.' });
  } catch (err) { bad(res, err.message || 'Could not save.'); }
});

router.delete('/portal/training/:id', staff, (req, res) => {
  db.prepare(`DELETE FROM agent_training WHERE id = ?`).run(id(req.params.id));
  brain.refreshTraining();
  res.json({ ok: true });
});

router.post('/portal/training/try', staff, (req, res) => {
  const q = clean(req.body?.message, 600);
  if (!q) return bad(res, 'Type a question to try.');
  const r = brain.answer(q);
  res.json({ ok: true, reply: r.reply, chips: r.chips, source: r.source, source_label: sourceLabel(r.source) });
});

module.exports = router;
