// ============================================================
//  PORTAL API — multi-user dashboard
//  Everyone signed in: profile, internal email, community, resources
//  Staff (admin, team): CRM overview, leads, calls, subscribers,
//                       outbox, Agent Yo analytics
//  Admin: user management
// ============================================================
const express = require('express');
const router = express.Router();
const db = require('../database/db');
const m = require('../lib/members');
const { agentAnalytics, agentTranscripts } = require('./agent');
const { saveUpload, removeUpload } = require('../lib/uploads');
const settings = require('../lib/settings');

const STAFF = ['admin', 'team'];
const isStaff = (u) => STAFF.includes(u.role);
const clean = (v, n = 2000) => String(v ?? '').trim().slice(0, n);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').toLowerCase());
const id = (v) => Number.parseInt(v, 10) || 0;
const anyone = m.requireMember();
const staff = m.requireMember(...STAFF);
const admin = m.requireMember('admin');
const bad = (res, msg, code = 400) => res.status(code).json({ ok: false, message: msg });

// ---------------- Profile ----------------
router.get('/portal/me', anyone, (req, res) => {
  const unread = db.prepare(`SELECT COUNT(*) n FROM messages WHERE to_id = ? AND read_at IS NULL`).get(req.member.id).n;
  const open_assignments = db.prepare(`SELECT COUNT(*) n FROM assignments WHERE assigned_to = ? AND status IN ('todo','in_progress','needs_changes')`).get(req.member.id).n;
  res.json({ ok: true, member: m.publicMember(req.member), unread, open_assignments });
});

router.post('/portal/password', anyone, (req, res) => {
  const { current, next } = req.body || {};
  const row = db.prepare(`SELECT password FROM members WHERE id = ?`).get(req.member.id);
  if (!m.checkPassword(current || '', row.password)) return bad(res, 'Your current password is not correct.');
  if (String(next || '').length < 10) return bad(res, 'Choose a new password of at least 10 characters.');
  db.prepare(`UPDATE members SET password = ? WHERE id = ?`).run(m.hashPassword(next), req.member.id);
  // Sign out every other session for safety
  db.prepare(`DELETE FROM member_sessions WHERE member_id = ? AND token_hash != ?`).run(req.member.id, m.sha256(m.tokenFrom(req)));
  res.json({ ok: true, message: 'Password updated. Other devices were signed out.' });
});

// Profile picture: the browser sends the image itself (already resized) as the request body
router.post('/portal/me/avatar', anyone, async (req, res) => {
  try {
    const { url } = await saveUpload(req, 'avatars');
    const old = db.prepare(`SELECT avatar FROM members WHERE id = ?`).get(req.member.id).avatar;
    db.prepare(`UPDATE members SET avatar = ? WHERE id = ?`).run(url, req.member.id);
    removeUpload(old);
    res.json({ ok: true, avatar: url, message: 'Profile picture updated.' });
  } catch (err) { res.status(err.status || 500).json({ ok: false, message: err.message || 'Could not save the picture.' }); }
});
router.delete('/portal/me/avatar', anyone, (req, res) => {
  const old = db.prepare(`SELECT avatar FROM members WHERE id = ?`).get(req.member.id).avatar;
  db.prepare(`UPDATE members SET avatar = '' WHERE id = ?`).run(req.member.id);
  removeUpload(old);
  res.json({ ok: true, message: 'Profile picture removed.' });
});

// People you can message: staff see everyone; members see the team
router.get('/portal/people', anyone, (req, res) => {
  const rows = isStaff(req.member)
    ? db.prepare(`SELECT id, name, COALESCE(role,'member') role, avatar FROM members WHERE status = 'active' AND id != ? ORDER BY role, name`).all(req.member.id)
    : db.prepare(`SELECT id, name, role, avatar FROM members WHERE status = 'active' AND role IN ('admin','team') ORDER BY name`).all();
  res.json({ ok: true, data: rows });
});

// ---------------- Internal email ----------------
router.get('/portal/messages', anyone, (req, res) => {
  const sent = req.query.box === 'sent';
  const rows = db.prepare(`
    SELECT msg.id, msg.thread_id, msg.subject, substr(msg.body, 1, 140) preview, msg.read_at, msg.created_at,
           f.name from_name, f.avatar from_avatar, t.name to_name, msg.from_id, msg.to_id
    FROM messages msg JOIN members f ON f.id = msg.from_id JOIN members t ON t.id = msg.to_id
    WHERE ${sent ? 'msg.from_id' : 'msg.to_id'} = ? ORDER BY msg.id DESC LIMIT 100`).all(req.member.id);
  res.json({ ok: true, data: rows });
});

router.get('/portal/messages/:id', anyone, (req, res) => {
  const msg = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(id(req.params.id));
  if (!msg || (msg.from_id !== req.member.id && msg.to_id !== req.member.id)) return bad(res, 'Message not found.', 404);
  const thread = msg.thread_id || msg.id;
  const rows = db.prepare(`
    SELECT msg.id, msg.subject, msg.body, msg.created_at, msg.read_at, msg.from_id, msg.to_id, f.name from_name, f.avatar from_avatar, t.name to_name
    FROM messages msg JOIN members f ON f.id = msg.from_id JOIN members t ON t.id = msg.to_id
    WHERE (msg.id = ? OR msg.thread_id = ?) AND (msg.from_id = ? OR msg.to_id = ?) ORDER BY msg.id`).all(thread, thread, req.member.id, req.member.id);
  db.prepare(`UPDATE messages SET read_at = datetime('now') WHERE (id = ? OR thread_id = ?) AND to_id = ? AND read_at IS NULL`).run(thread, thread, req.member.id);
  res.json({ ok: true, thread_id: thread, data: rows });
});

router.post('/portal/messages', anyone, (req, res) => {
  const to = db.prepare(`SELECT id, COALESCE(role,'member') role, status FROM members WHERE id = ?`).get(id(req.body?.to_id));
  const subject = clean(req.body?.subject, 160), body = clean(req.body?.body, 8000);
  if (!to || to.status !== 'active') return bad(res, 'Choose who to send it to.');
  if (to.id === req.member.id) return bad(res, 'You can\'t send a message to yourself.');
  if (!isStaff(req.member) && !STAFF.includes(to.role)) return bad(res, 'Members can message Yo\'s team.', 403);
  if (!subject || !body) return bad(res, 'Add a subject and a message.');
  let thread = id(req.body?.thread_id) || null;
  if (thread) {
    const t = db.prepare(`SELECT * FROM messages WHERE id = ?`).get(thread);
    if (!t || (t.from_id !== req.member.id && t.to_id !== req.member.id)) thread = null;
  }
  const { lastInsertRowid } = db.prepare(`INSERT INTO messages (thread_id, from_id, to_id, subject, body) VALUES (?, ?, ?, ?, ?)`).run(thread, req.member.id, to.id, subject, body);
  res.status(201).json({ ok: true, id: lastInsertRowid, message: 'Sent.' });
});

// Admin: send one message to every member
router.post('/portal/broadcast', admin, (req, res) => {
  const subject = clean(req.body?.subject, 160), body = clean(req.body?.body, 8000);
  if (!subject || !body) return bad(res, 'Add a subject and a message.');
  const recipients = db.prepare(`SELECT id FROM members WHERE status = 'active' AND id != ?`).all(req.member.id);
  const ins = db.prepare(`INSERT INTO messages (from_id, to_id, subject, body) VALUES (?, ?, ?, ?)`);
  db.transaction(() => recipients.forEach((r) => ins.run(req.member.id, r.id, subject, body)))();
  res.json({ ok: true, message: `Sent to ${recipients.length} people.` });
});

// ---------------- Community ----------------
router.get('/portal/community', anyone, (req, res) => {
  const posts = db.prepare(`SELECT p.id, p.body, p.media, p.pinned, p.created_at, p.member_id, mm.name author, mm.avatar author_avatar, COALESCE(mm.role,'member') author_role FROM community_posts p JOIN members mm ON mm.id = p.member_id ORDER BY p.pinned DESC, p.id DESC LIMIT 50`).all();
  const comments = posts.length ? db.prepare(`SELECT c.id, c.post_id, c.body, c.created_at, c.member_id, mm.name author, mm.avatar author_avatar FROM community_comments c JOIN members mm ON mm.id = c.member_id WHERE c.post_id IN (${posts.map(() => '?').join(',')}) ORDER BY c.id`).all(...posts.map((p) => p.id)) : [];
  res.json({ ok: true, data: posts.map((p) => ({ ...p, media: postMedia(p.media), mine: p.member_id === req.member.id, comments: comments.filter((c) => c.post_id === p.id) })) });
});
// Community attachments: up to 4 photos, or 1 video (uploaded file, YouTube, Vimeo or .mp4 link)
const parseMedia = (raw) => { try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a : []; } catch { return []; } };
const postMedia = (raw) => parseMedia(raw).map((m) => (m.type === 'photo' ? { type: 'photo', src: m.src } : { type: 'video', src: m.src, video: settings.classifyVideo(m.src) || null })).filter((m) => m.type === 'photo' || m.video);
const readMedia = (list) => {
  const items = Array.isArray(list) ? list.slice(0, 5) : [];
  const out = [];
  for (const m of items) {
    const src = clean(m && m.src, 600);
    if (m && m.type === 'photo') {
      if (!/^\/uploads\/photos\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(src)) throw { message: 'Upload the photo first.' };
      out.push({ type: 'photo', src });
    } else if (m && m.type === 'video') {
      if (!settings.classifyVideo(src)) throw { message: 'Use a YouTube or Vimeo link, a direct .mp4/.webm link, or upload the video.' };
      out.push({ type: 'video', src });
    }
  }
  if (out.filter((m) => m.type === 'photo').length > 4) throw { message: 'Add up to 4 photos per post.' };
  if (out.filter((m) => m.type === 'video').length > 1) throw { message: 'Add one video per post.' };
  return out;
};

// Signed-in members can upload photos and videos for their posts
router.post('/portal/community/upload', anyone, async (req, res) => {
  const kind = ['photos', 'videos'].includes(req.query.kind) ? req.query.kind : null;
  if (!kind) return bad(res, 'Choose a photo or a video.');
  try { const { url } = await saveUpload(req, kind); res.status(201).json({ ok: true, url }); }
  catch (err) { res.status(err.status || 500).json({ ok: false, message: err.message || 'Upload failed.' }); }
});

router.post('/portal/community', anyone, (req, res) => {
  const body = clean(req.body?.body, 4000);
  let media;
  try { media = readMedia(req.body?.media); } catch (err) { return bad(res, err.message); }
  if (!body && !media.length) return bad(res, 'Write something or add a photo or video.');
  const { lastInsertRowid } = db.prepare(`INSERT INTO community_posts (member_id, body, media) VALUES (?, ?, ?)`).run(req.member.id, body, media.length ? JSON.stringify(media) : '');
  res.status(201).json({ ok: true, id: lastInsertRowid });
});
router.post('/portal/community/:id/comments', anyone, (req, res) => {
  const post = db.prepare(`SELECT id FROM community_posts WHERE id = ?`).get(id(req.params.id));
  const body = clean(req.body?.body, 2000);
  if (!post) return bad(res, 'Post not found.', 404);
  if (!body) return bad(res, 'Write a comment.');
  db.prepare(`INSERT INTO community_comments (post_id, member_id, body) VALUES (?, ?, ?)`).run(post.id, req.member.id, body);
  res.status(201).json({ ok: true });
});
router.delete('/portal/community/:id', anyone, (req, res) => {
  const post = db.prepare(`SELECT * FROM community_posts WHERE id = ?`).get(id(req.params.id));
  if (!post) return bad(res, 'Post not found.', 404);
  if (post.member_id !== req.member.id && !isStaff(req.member)) return bad(res, 'You can only delete your own posts.', 403);
  db.prepare(`DELETE FROM community_posts WHERE id = ?`).run(post.id);
  parseMedia(post.media).forEach((m) => removeUpload(m.src));
  res.json({ ok: true });
});
router.post('/portal/community/:id/pin', staff, (req, res) => {
  const { changes } = db.prepare(`UPDATE community_posts SET pinned = 1 - pinned WHERE id = ?`).run(id(req.params.id));
  res.json({ ok: changes > 0 });
});

// ---------------- Resources ----------------
router.get('/portal/resources', anyone, (req, res) => {
  const rows = db.prepare(`SELECT r.id, r.title, r.description, r.url, r.kind, r.audience, r.created_at FROM portal_resources r WHERE r.audience = 'all' OR r.audience = ? ${isStaff(req.member) ? "OR 1 = 1" : ''} ORDER BY r.id DESC`).all(req.member.role === 'member' ? 'member' : 'team');
  res.json({ ok: true, data: rows });
});
router.post('/portal/resources', staff, (req, res) => {
  const title = clean(req.body?.title, 160), url = clean(req.body?.url, 600);
  const kind = ['Workbook', 'Template', 'Recording', 'Link'].includes(req.body?.kind) ? req.body.kind : 'Link';
  const audience = ['all', 'member', 'team'].includes(req.body?.audience) ? req.body.audience : 'all';
  if (!title) return bad(res, 'Add a title.');
  if (!/^(https?:\/\/|\/)[^\s<>"']+$/.test(url)) return bad(res, 'Add a link starting with https:// or /');
  db.prepare(`INSERT INTO portal_resources (title, description, url, kind, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)`).run(title, clean(req.body?.description, 600), url, kind, audience, req.member.id);
  res.status(201).json({ ok: true });
});
router.delete('/portal/resources/:id', staff, (req, res) => {
  db.prepare(`DELETE FROM portal_resources WHERE id = ?`).run(id(req.params.id));
  res.json({ ok: true });
});

// ---------------- Assignments ----------------
// Staff assign work to anyone; the assignee updates progress and submits;
// staff review (feedback, needs_changes, done). Each step sends an inbox note.
const A_STATUS = ['todo', 'in_progress', 'submitted', 'needs_changes', 'done'];
const A_LABEL = { todo: 'To do', in_progress: 'In progress', submitted: 'Submitted', needs_changes: 'Needs changes', done: 'Done' };
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
const notify = (from, to, subject, body) => { if (from && to && from !== to) db.prepare(`INSERT INTO messages (from_id, to_id, subject, body) VALUES (?, ?, ?, ?)`).run(from, to, subject, body); };
const assignmentRow = (where) => `
  SELECT a.*, t.name assigned_to_name, COALESCE(t.role,'member') assigned_to_role, b.name assigned_by_name
  FROM assignments a JOIN members t ON t.id = a.assigned_to LEFT JOIN members b ON b.id = a.assigned_by
  WHERE ${where}`;

router.get('/portal/assignments', anyone, (req, res) => {
  const mine = !isStaff(req.member) || req.query.view === 'mine';
  const rows = db.prepare(assignmentRow(mine ? 'a.assigned_to = ?' : '1 = 1 OR a.assigned_to = ?') + `
    ORDER BY CASE a.status WHEN 'submitted' THEN 0 WHEN 'needs_changes' THEN 1 WHEN 'in_progress' THEN 2 WHEN 'todo' THEN 3 ELSE 4 END,
             CASE WHEN a.due_date = '' THEN '9999' ELSE a.due_date END, a.id DESC LIMIT 300`).all(req.member.id);
  res.json({ ok: true, data: rows });
});

router.post('/portal/assignments', staff, (req, res) => {
  const title = clean(req.body?.title, 160), details = clean(req.body?.details, 8000), due = clean(req.body?.due_date, 10);
  const to = db.prepare(`SELECT id, name, status FROM members WHERE id = ?`).get(id(req.body?.assigned_to));
  if (!title) return bad(res, 'Add a title.');
  if (!to || to.status !== 'active') return bad(res, 'Choose who it is for.');
  if (due && !isDate(due)) return bad(res, 'Use a valid due date.');
  const { lastInsertRowid } = db.prepare(`INSERT INTO assignments (title, details, assigned_by, assigned_to, due_date) VALUES (?, ?, ?, ?, ?)`).run(title, details, req.member.id, to.id, due);
  notify(req.member.id, to.id, `New assignment: ${title}`, `${req.member.name} assigned you "${title}"${due ? `, due ${due}` : ''}.\n\n${details}\n\nOpen it under Assignments in the portal.`);
  res.status(201).json({ ok: true, id: lastInsertRowid, message: `Assigned to ${to.name}.` });
});

router.patch('/portal/assignments/:id', anyone, (req, res) => {
  const a = db.prepare(`SELECT * FROM assignments WHERE id = ?`).get(id(req.params.id));
  if (!a) return bad(res, 'Assignment not found.', 404);
  const staffer = isStaff(req.member), assignee = a.assigned_to === req.member.id;
  if (!staffer && !assignee) return bad(res, 'Assignment not found.', 404);
  const b = req.body || {};
  const next = { status: a.status, submission: a.submission, feedback: a.feedback, title: a.title, details: a.details, due_date: a.due_date };
  if (b.status !== undefined) {
    if (!A_STATUS.includes(b.status)) return bad(res, 'Unknown status.');
    // The assignee moves their own work forward; only staff review it
    const assigneeMay = ['todo', 'in_progress', 'submitted'];
    if (!staffer && !assigneeMay.includes(b.status)) return bad(res, 'Only Yo\'s team can mark work reviewed.', 403);
    if (!staffer && a.status === 'done') return bad(res, 'This assignment is already complete.', 403);
    next.status = b.status;
  }
  if (b.submission !== undefined) { if (!assignee) return bad(res, 'Only the person assigned can submit work.', 403); next.submission = clean(b.submission, 8000); }
  if (staffer) {
    if (b.feedback !== undefined) next.feedback = clean(b.feedback, 8000);
    if (b.title !== undefined) next.title = clean(b.title, 160) || a.title;
    if (b.details !== undefined) next.details = clean(b.details, 8000);
    if (b.due_date !== undefined) { const d = clean(b.due_date, 10); if (d && !isDate(d)) return bad(res, 'Use a valid due date.'); next.due_date = d; }
  }
  if (next.status === 'submitted' && !next.submission.trim() && assignee && b.status === 'submitted') return bad(res, 'Add a note or link about your work before submitting.');
  db.prepare(`UPDATE assignments SET status = ?, submission = ?, feedback = ?, title = ?, details = ?, due_date = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(next.status, next.submission, next.feedback, next.title, next.details, next.due_date, a.id);

  if (next.status !== a.status) {
    if (assignee && next.status === 'submitted') notify(req.member.id, a.assigned_by, `Submitted: ${a.title}`, `${req.member.name} submitted "${a.title}".\n\n${next.submission}`);
    else if (staffer && !assignee) notify(req.member.id, a.assigned_to, `${A_LABEL[next.status]}: ${a.title}`, `${req.member.name} marked "${a.title}" as ${A_LABEL[next.status].toLowerCase()}.${next.feedback ? `\n\nFeedback:\n${next.feedback}` : ''}`);
  } else if (staffer && !assignee && b.feedback !== undefined && next.feedback !== a.feedback && next.feedback) {
    notify(req.member.id, a.assigned_to, `Feedback: ${a.title}`, `${req.member.name} left feedback on "${a.title}":\n\n${next.feedback}`);
  }
  res.json({ ok: true, message: 'Saved.' });
});

router.delete('/portal/assignments/:id', staff, (req, res) => {
  const { changes } = db.prepare(`DELETE FROM assignments WHERE id = ?`).run(id(req.params.id));
  res.json({ ok: changes > 0 });
});

// ---------------- Staff: CRM ----------------
router.get('/portal/overview', staff, (req, res) => {
  const n = (sql, ...a) => db.prepare(sql).get(...a).n;
  res.json({
    ok: true,
    kpis: {
      new_inquiries: n(`SELECT COUNT(*) n FROM inquiries WHERE status = 'new'`),
      hot_leads: n(`SELECT COUNT(*) n FROM inquiries WHERE score >= 60 AND status IN ('new','read')`),
      upcoming_calls: n(`SELECT COUNT(*) n FROM calls WHERE status = 'booked' AND starts_at > ?`, new Date().toISOString()),
      subscribers: n(`SELECT COUNT(*) n FROM subscribers WHERE status = 'active'`),
      queued_emails: n(`SELECT COUNT(*) n FROM outbox WHERE status != 'sent'`),
      page_views_7d: n(`SELECT COUNT(*) n FROM page_views WHERE created_at > datetime('now','-7 days')`),
      open_assignments: n(`SELECT COUNT(*) n FROM assignments WHERE status IN ('todo','in_progress','needs_changes')`),
      to_review: n(`SELECT COUNT(*) n FROM assignments WHERE status = 'submitted'`),
    },
    recent_leads: db.prepare(`SELECT id, name, email, organization, inquiry_type, event_type, event_date, score, status, created_at FROM inquiries ORDER BY id DESC LIMIT 8`).all(),
    upcoming_calls: db.prepare(`SELECT c.id, c.name, c.email, c.starts_at, c.inquiry_id FROM calls c WHERE c.status = 'booked' AND c.starts_at > ? ORDER BY c.starts_at LIMIT 8`).all(new Date().toISOString()),
    subscribers_by_source: db.prepare(`SELECT source, COUNT(*) n FROM subscribers GROUP BY source ORDER BY n DESC`).all(),
    agent: agentAnalytics(),
  });
});

router.get('/portal/leads', staff, (req, res) => {
  const status = ['new', 'read', 'replied', 'closed'].includes(req.query.status) ? req.query.status : null;
  const q = clean(req.query.q, 80).toLowerCase();
  const rows = db.prepare(`SELECT id, name, email, phone, organization, inquiry_type, event_type, event_date, budget, message, score, source, status, created_at FROM inquiries
    WHERE (? IS NULL OR status = ?) AND (? = '' OR lower(name || ' ' || email || ' ' || COALESCE(organization,'') || ' ' || COALESCE(message,'')) LIKE ?)
    ORDER BY id DESC LIMIT 200`).all(status, status, q, `%${q}%`);
  res.json({ ok: true, data: rows });
});
router.patch('/portal/leads/:id', staff, (req, res) => {
  const status = req.body?.status;
  if (!['new', 'read', 'replied', 'closed'].includes(status)) return bad(res, 'Unknown status.');
  const { changes } = db.prepare(`UPDATE inquiries SET status = ? WHERE id = ?`).run(status, id(req.params.id));
  res.json({ ok: changes > 0 });
});

router.get('/portal/calls', staff, (req, res) => {
  res.json({ ok: true, data: db.prepare(`SELECT id, name, email, starts_at, status, inquiry_id, created_at FROM calls ORDER BY starts_at DESC LIMIT 200`).all() });
});
router.patch('/portal/calls/:id', staff, (req, res) => {
  const status = req.body?.status;
  if (!['booked', 'done', 'cancelled'].includes(status)) return bad(res, 'Unknown status.');
  const { changes } = db.prepare(`UPDATE calls SET status = ? WHERE id = ?`).run(status, id(req.params.id));
  res.json({ ok: changes > 0 });
});

router.get('/portal/subscribers', staff, (req, res) => {
  const rows = db.prepare(`SELECT email, first_name, source, status, created_at FROM subscribers ORDER BY id DESC`).all();
  if (req.query.format === 'csv') {
    const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="subscribers.csv"' });
    return res.send(['email,first_name,source,status,created_at', ...rows.map((r) => [r.email, r.first_name, r.source, r.status, r.created_at].map(csv).join(','))].join('\n'));
  }
  res.json({ ok: true, data: rows });
});

router.get('/portal/outbox', staff, (req, res) => {
  res.json({ ok: true, data: db.prepare(`SELECT id, to_email, subject, kind, status, error, created_at, sent_at FROM outbox ORDER BY id DESC LIMIT 100`).all() });
});

router.get('/portal/agent', staff, (req, res) => res.json({ ok: true, analytics: agentAnalytics(), sessions: agentTranscripts() }));

// ---------------- Admin: users ----------------
router.get('/portal/users', admin, (req, res) => {
  res.json({ ok: true, data: db.prepare(`SELECT id, name, email, COALESCE(role,'member') role, status, programs, avatar, created_at FROM members ORDER BY created_at DESC`).all() });
});
router.post('/portal/users', admin, (req, res) => {
  const name = clean(req.body?.name, 120), email = clean(req.body?.email, 160).toLowerCase();
  const role = m.ROLES.includes(req.body?.role) ? req.body.role : 'member';
  if (!name || !isEmail(email)) return bad(res, 'Add a name and a valid email.');
  const password = m.tempPassword();
  try {
    db.prepare(`INSERT INTO members (name, email, password, programs, role) VALUES (?, ?, ?, ?, ?)`).run(name, email, m.hashPassword(password), clean(req.body?.programs, 300), role);
  } catch (err) {
    if (/UNIQUE/.test(err.message)) return bad(res, 'Someone with that email already has an account.', 409);
    throw err;
  }
  res.status(201).json({ ok: true, temp_password: password, message: 'Account created. Share the temporary password privately; they can change it in Account.' });
});
const adminCount = () => db.prepare(`SELECT COUNT(*) n FROM members WHERE role = 'admin' AND status = 'active'`).get().n;
router.patch('/portal/users/:id', admin, (req, res) => {
  const user = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id(req.params.id));
  if (!user) return bad(res, 'User not found.', 404);
  const role = m.ROLES.includes(req.body?.role) ? req.body.role : user.role;
  const status = ['active', 'paused'].includes(req.body?.status) ? req.body.status : user.status;
  const name = req.body?.name !== undefined ? clean(req.body.name, 120) : user.name;
  const email = req.body?.email !== undefined ? clean(req.body.email, 160).toLowerCase() : user.email;
  if (!name) return bad(res, 'Name can\'t be empty.');
  if (!isEmail(email)) return bad(res, 'Use a valid email address.');
  const losingAdmin = user.role === 'admin' && (role !== 'admin' || status !== 'active');
  if (losingAdmin && adminCount() <= 1) return bad(res, 'Keep at least one active admin.');
  try {
    db.prepare(`UPDATE members SET name = ?, email = ?, role = ?, status = ?, programs = ? WHERE id = ?`).run(name, email, role, status, req.body?.programs !== undefined ? clean(req.body.programs, 300) : user.programs, user.id);
  } catch (err) {
    if (/UNIQUE/.test(err.message)) return bad(res, 'Another account already uses that email.', 409);
    throw err;
  }
  if (status !== 'active') db.prepare(`DELETE FROM member_sessions WHERE member_id = ?`).run(user.id);
  res.json({ ok: true });
});
router.post('/portal/users/:id/reset', admin, (req, res) => {
  const user = db.prepare(`SELECT id FROM members WHERE id = ?`).get(id(req.params.id));
  if (!user) return bad(res, 'User not found.', 404);
  const password = m.tempPassword();
  db.prepare(`UPDATE members SET password = ? WHERE id = ?`).run(m.hashPassword(password), user.id);
  db.prepare(`DELETE FROM member_sessions WHERE member_id = ?`).run(user.id);
  res.json({ ok: true, temp_password: password });
});

// Admin: remove someone's profile picture, or delete an account
router.delete('/portal/users/:id/avatar', admin, (req, res) => {
  const user = db.prepare(`SELECT id, avatar FROM members WHERE id = ?`).get(id(req.params.id));
  if (!user) return bad(res, 'User not found.', 404);
  db.prepare(`UPDATE members SET avatar = '' WHERE id = ?`).run(user.id);
  removeUpload(user.avatar);
  res.json({ ok: true, message: 'Picture removed.' });
});
router.delete('/portal/users/:id', admin, (req, res) => {
  const user = db.prepare(`SELECT * FROM members WHERE id = ?`).get(id(req.params.id));
  if (!user) return bad(res, 'User not found.', 404);
  if (user.id === req.member.id) return bad(res, 'You can\'t delete your own account while signed in.');
  if (user.role === 'admin' && adminCount() <= 1) return bad(res, 'Keep at least one active admin.');
  db.transaction(() => {
    db.prepare(`DELETE FROM member_sessions WHERE member_id = ?`).run(user.id);
    db.prepare(`DELETE FROM messages WHERE from_id = ? OR to_id = ?`).run(user.id, user.id);
    db.prepare(`DELETE FROM members WHERE id = ?`).run(user.id);
  })();
  removeUpload(user.avatar);
  res.json({ ok: true, message: `${user.name}'s account was deleted.` });
});

// ---------------- Admin: site settings ----------------
// Public: what the website needs (background videos, announcement bar)
router.get('/settings', (req, res) => { res.set('Cache-Control', 'no-store'); res.json({ ok: true, ...settings.publicView() }); });
router.get('/portal/settings', admin, (req, res) => res.json({ ok: true, data: settings.all(), view: settings.publicView() }));

const videoField = async (link) => {
  const v = String(link ?? '').trim();
  if (!v) return { value: '', type: '' };
  const known = settings.classifyVideo(v);
  if (known) return { value: v, type: '' };
  if (known === undefined && /^https?:\/\//i.test(v)) {
    const probed = await settings.probeVideo(v);
    if (probed) return { value: v, type: 'file' };
  }
  throw { status: 400, message: 'That link isn\'t a video we can play. Use a YouTube or Vimeo link, a direct link to an .mp4 or .webm file, or upload the video.' };
};

router.put('/portal/settings', admin, async (req, res) => {
  const b = req.body || {};
  const next = {};
  try {
    for (const slot of ['hero_video', 'page_video']) {
      if (b[slot] === undefined) continue;
      const before = settings.all()[slot];
      const { value, type } = await videoField(b[slot]);
      next[slot] = value; next[`${slot}_type`] = type;
      if (before !== value) removeUpload(before);
    }
  } catch (err) { return bad(res, err.message, err.status || 400); }
  if (b.video_strength !== undefined) next.video_strength = String(Math.min(90, Math.max(10, Number(b.video_strength) || 42)));
  if (b.announce_on !== undefined) next.announce_on = b.announce_on === true || b.announce_on === '1' || b.announce_on === 'on' ? '1' : '0';
  if (b.announce_text !== undefined) next.announce_text = clean(b.announce_text, 160);
  if (b.announce_link !== undefined) {
    const l = clean(b.announce_link, 400);
    if (l && !/^(https?:\/\/|\/)[^\s<>"']+$/.test(l)) return bad(res, 'The announcement link should start with https:// or /');
    next.announce_link = l;
  }
  settings.save(next);
  res.json({ ok: true, message: 'Saved. The website shows the change right away.', data: settings.all(), view: settings.publicView() });
});

// Upload a background video file: body = the video, ?slot=hero_video|page_video
router.post('/portal/settings/video', admin, async (req, res) => {
  const slot = ['hero_video', 'page_video'].includes(req.query.slot) ? req.query.slot : null;
  if (!slot) return bad(res, 'Choose where the video goes.');
  try {
    const { url } = await saveUpload(req, 'videos');
    const before = settings.all()[slot];
    settings.save({ [slot]: url, [`${slot}_type`]: '' });
    if (before !== url) removeUpload(before);
    res.json({ ok: true, url, message: 'Video uploaded. It now plays on the website.', view: settings.publicView() });
  } catch (err) { res.status(err.status || 500).json({ ok: false, message: err.message || 'Upload failed.' }); }
});

module.exports = router;
