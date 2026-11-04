// ============================================================
//  Agent Yo — AI concierge backend (Claude API)
//  POST /api/agent/chat        one visitor turn (runs tools as needed)
//  POST /api/agent/forget      delete a conversation (privacy)
//  GET  /api/agent/analytics   admin: top questions, conversion, drop-off, gaps
//  GET  /api/agent/sessions    admin: recent transcripts
//
//  Needs ANTHROPIC_API_KEY on the server. Without it, /chat answers
//  { offline: true } and the site falls back to its guided mode.
// ============================================================
const express = require('express');
const crypto = require('crypto');
const AnthropicModule = require('@anthropic-ai/sdk');
const Anthropic = AnthropicModule.default || AnthropicModule;
const router = express.Router();
const db = require('../database/db');
const { requireAdmin } = require('../lib/auth');
const { systemPrompt, URL } = require('../lib/agent-knowledge');
const { scoreLead, notifyBooking, queueEmail, syncCRM, HOT } = require('../lib/leads');
const { allSlots, AVAIL } = require('./booking');

const MODEL = process.env.AGENT_MODEL || 'claude-opus-5-5';
const EFFORT = process.env.AGENT_EFFORT || 'medium';
const MAX_TURNS = 40;          // per conversation, then hand off to a human
const MAX_TOOL_ROUNDS = 5;     // tool calls per visitor turn
const hasCredentials = () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
let client = null;
const getClient = () => (client ||= new Anthropic());

const CRISIS = /\b(suicid\w*|kill (my ?self|me)|end (my|it all)|self[- ]?harm|hurt (my ?self)|want to die|don'?t want to (live|be here)|no reason to live)\b/i;
const CRISIS_REPLY = "I'm really glad you told me, and I'm sorry you're carrying this. You deserve support from a real person right now. In the US you can call or text 988 to reach the Suicide & Crisis Lifeline, or chat at https://988lifeline.org, any time of day. If you're in immediate danger, please call 911. I'm an AI and can't help with this, but those people can.";
const CRISIS_NOTE = 'Operator note: earlier in this conversation the visitor expressed distress. Do not offer bookings, programs, sales or lead capture. Be warm and supportive, keep the 988 Lifeline available, and answer only what they ask.';

const ipHash = (req) => crypto.createHash('sha256').update(String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')).digest('hex').slice(0, 16);
const isEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').toLowerCase());
const clean = (v, n = 500) => String(v ?? '').trim().slice(0, n);

// Rate limit: 30 messages / 10 minutes per IP
const hits = new Map();
const limited = (req) => {
  const k = ipHash(req), now = Date.now();
  const list = (hits.get(k) || []).filter((t) => now - t < 600000);
  list.push(now); hits.set(k, list);
  return list.length > 30;
};

// ---------------- Tools (strict schemas) ----------------
const str = (description) => ({ type: 'string', description });
const TOOLS = [
  {
    name: 'save_lead',
    description: 'Send the visitor\'s details to Yo\'s team. Call only after the visitor has said yes to sharing their details in this conversation. Use empty strings for details you do not know.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: {
        mode: { type: 'string', enum: ['planner', 'builder', 'partner'], description: 'Which kind of visitor this is.' },
        name: str('Visitor name.'), email: str('Visitor email.'), organization: str('Organization, if any.'),
        event_type: str('Event type, e.g. Conference.'), event_date: str('Event date as YYYY-MM-DD if known, else the visitor\'s words.'),
        audience_size: str('One of: Under 50, 50 to 200, 200 to 500, 500+, or empty.'),
        budget: str('One of: Under $2,500, $2,500 to $5,000, $5,000 to $10,000, $10,000+, Not sure yet, or empty.'),
        decision_maker: str('Whether the visitor decides, e.g. Yes, I decide / committee / recommending.'),
        goals: str('Short summary of what they want.'), recommended_talk: str('Talk slug you recommended, or empty.'),
        consent_confirmed: { type: 'boolean', description: 'True only if the visitor explicitly agreed in this conversation.' },
      },
      required: ['mode', 'name', 'email', 'organization', 'event_type', 'event_date', 'audience_size', 'budget', 'decision_maker', 'goals', 'recommended_talk', 'consent_confirmed'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_call_slots',
    description: 'List the next open 30-minute discovery-call times (Pacific time). Use before offering times.',
    strict: true,
    input_schema: { type: 'object', properties: {}, required: [], additionalProperties: false },
  },
  {
    name: 'book_discovery_call',
    description: 'Book a discovery call at one of the exact open times from get_call_slots, after the visitor chose it and confirmed their name and email.',
    strict: true,
    input_schema: {
      type: 'object',
      properties: { name: str('Visitor name.'), email: str('Visitor email.'), starts_at: str('The exact ISO time from get_call_slots.'), consent_confirmed: { type: 'boolean', description: 'True only if the visitor agreed to book.' } },
      required: ['name', 'email', 'starts_at', 'consent_confirmed'],
      additionalProperties: false,
    },
  },
  {
    name: 'log_content_gap',
    description: 'Record a question you could not answer from the knowledge base, so the team can cover it in a future episode, post or FAQ.',
    strict: true,
    input_schema: { type: 'object', properties: { question: str('The visitor\'s question, in brief.'), topic: str('One or two word topic.') }, required: ['question', 'topic'], additionalProperties: false },
  },
];

function runTool(name, input, session) {
  try {
    if (session.locked && name !== 'log_content_gap') return { ok: false, error: 'Not available in this conversation. Offer support only.' };
    if (name === 'save_lead') {
      if (input.consent_confirmed !== true) return { ok: false, error: 'Consent not confirmed. Ask the visitor first.' };
      const email = clean(input.email, 160).toLowerCase(), nm = clean(input.name, 120);
      if (!nm || !isEmail(email)) return { ok: false, error: 'A name and a valid email are needed.' };
      const details = { event_type: clean(input.event_type), event_date: clean(input.event_date), audience: clean(input.audience_size), budget: clean(input.budget), decision_maker: clean(input.decision_maker), organization: clean(input.organization), goals: clean(input.goals, 1200), topic: clean(input.recommended_talk, 80) };
      const score = input.mode === 'planner' ? scoreLead(details) : 0;
      const summary = Object.entries({ Mode: input.mode, Event: details.event_type, Date: details.event_date, Audience: details.audience, Budget: details.budget, 'Decision maker': details.decision_maker, Talk: details.topic, Goals: details.goals }).filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`).join('\n');
      const { lastInsertRowid: id } = db.prepare(`INSERT INTO inquiries (name, email, organization, inquiry_type, event_type, event_date, budget, message, score, details, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'agent')`)
        .run(nm, email, details.organization, `Agent Yo · ${input.mode}`, details.event_type, details.event_date, details.budget, summary || '(from Agent Yo)', score, JSON.stringify({ ...details, session_id: session.id }));
      if (input.mode === 'builder') db.prepare(`INSERT OR IGNORE INTO subscribers (email, first_name, source) VALUES (?, ?, 'agent-builder')`).run(email, nm.split(' ')[0]);
      db.prepare(`UPDATE agent_sessions SET lead_id = ?, mode = ? WHERE id = ?`).run(id, input.mode, session.id);
      if (input.mode === 'planner') notifyBooking({ id, name: nm, email, score, summary, talk: /^[a-z-]+$/.test(details.topic) ? details.topic : '' });
      else if (process.env.ALERT_EMAIL) queueEmail({ to: process.env.ALERT_EMAIL, kind: 'agent-summary', subject: `Agent Yo ${input.mode} lead: ${nm}`, body: `${nm} <${email}>\n\n${summary}\n\nConversation: ${session.id}` });
      syncCRM({ type: 'agent-lead', id, name: nm, email, score, tags: ['agent-yo', input.mode], ...details });
      const qs = new URLSearchParams({ talk: details.topic, event_type: details.event_type, audience: details.audience }).toString();
      return { ok: true, saved: true, hot: score >= HOT, booking_link: URL(`book/?${qs}`) };
    }
    if (name === 'get_call_slots') {
      const taken = new Set(db.prepare(`SELECT starts_at FROM calls WHERE status = 'booked'`).all().map((r) => r.starts_at));
      const fmt = new Intl.DateTimeFormat('en-US', { timeZone: AVAIL.timeZone, weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      return { ok: true, slots: allSlots().filter((s) => !taken.has(s)).slice(0, 8).map((s) => ({ starts_at: s, label: fmt.format(new Date(s)) })) };
    }
    if (name === 'book_discovery_call') {
      if (input.consent_confirmed !== true) return { ok: false, error: 'The visitor has not confirmed yet.' };
      if (!clean(input.name) || !isEmail(input.email)) return { ok: false, error: 'A name and a valid email are needed.' };
      if (!allSlots().includes(input.starts_at)) return { ok: false, error: 'That time is not available. Call get_call_slots again.' };
      try {
        db.prepare(`INSERT INTO calls (name, email, inquiry_id, starts_at) VALUES (?, ?, ?, ?)`).run(clean(input.name, 120), clean(input.email, 160).toLowerCase(), session.lead_id || null, input.starts_at);
      } catch (e) { return { ok: false, error: 'That time was just taken. Offer another.' }; }
      const when = new Date(input.starts_at).toLocaleString('en-US', { timeZone: AVAIL.timeZone, weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      queueEmail({ to: clean(input.email, 160), kind: 'call', subject: `Your discovery call with Yo: ${when}`, body: `Hi ${clean(input.name, 120)},\n\nYour 30-minute discovery call is booked for ${when}. We'll send a video link before the call.\n\nThe Business of You team` });
      if (process.env.ALERT_EMAIL) queueEmail({ to: process.env.ALERT_EMAIL, kind: 'call', subject: `Discovery call booked via Agent Yo: ${clean(input.name, 120)} · ${when}`, body: `${clean(input.name, 120)} <${clean(input.email, 160)}> booked through Agent Yo for ${when}.` });
      syncCRM({ type: 'discovery-call', source: 'agent-yo', name: input.name, email: input.email, starts_at: input.starts_at });
      return { ok: true, booked: true, when };
    }
    if (name === 'log_content_gap') {
      db.prepare(`INSERT INTO agent_gaps (session_id, question, topic) VALUES (?, ?, ?)`).run(session.id, clean(input.question, 500), clean(input.topic, 60));
      return { ok: true, logged: true };
    }
    return { ok: false, error: `Unknown tool ${name}` };
  } catch (err) {
    console.error('[agent tool]', name, err.message);
    return { ok: false, error: 'The tool failed. Offer the visitor the booking page or contact page instead.' };
  }
}

// ---------------- Session storage ----------------
const getSession = (id, page, req) => {
  let s = /^[a-zA-Z0-9-]{16,64}$/.test(id || '') && db.prepare(`SELECT * FROM agent_sessions WHERE id = ?`).get(id);
  if (!s) {
    const newId = crypto.randomUUID();
    db.prepare(`INSERT INTO agent_sessions (id, page, ip_hash) VALUES (?, ?, ?)`).run(newId, clean(page, 200), ipHash(req));
    s = db.prepare(`SELECT * FROM agent_sessions WHERE id = ?`).get(newId);
  }
  return s;
};
const saveSession = (s, messages, extra = {}) => {
  db.prepare(`UPDATE agent_sessions SET messages = ?, turns = turns + 1, first_message = CASE WHEN first_message = '' THEN ? ELSE first_message END, locked = MAX(locked, ?), mode = CASE WHEN ? != '' THEN ? ELSE mode END, updated_at = datetime('now') WHERE id = ?`)
    .run(JSON.stringify(messages), clean(extra.first || '', 300), extra.locked ? 1 : 0, extra.mode || '', extra.mode || '', s.id);
};
const textOf = (content) => (typeof content === 'string' ? content : (content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n')).trim();
const guessMode = (t) => (/\b(event|conference|keynote|summit|speak|booking|book (yo|her)|panel)\b/i.test(t) ? 'planner' : /\b(guest|sponsor|press|media|interview|partner)\b/i.test(t) ? 'partner' : /\b(idea|business|start|credit|fund|grow|speaker)\b/i.test(t) ? 'builder' : '');

// ---------------- POST /api/agent/chat ----------------
router.post('/agent/chat', async (req, res) => {
  const message = clean(req.body?.message, 1200);
  if (!message) return res.status(400).json({ ok: false, message: 'Please type a message.' });
  if (limited(req)) return res.status(429).json({ ok: false, message: 'You\'re sending messages quickly. Please wait a few minutes, or use the contact page.' });

  const session = getSession(req.body?.session_id, req.body?.page, req);
  const messages = JSON.parse(session.messages || '[]');
  const firstUser = messages.length === 0 ? message : '';

  // Guardrail: crisis redirect happens in code, before any model call
  if (CRISIS.test(message)) {
    messages.push({ role: 'user', content: message }, { role: 'assistant', content: CRISIS_REPLY });
    saveSession(session, messages, { first: firstUser, locked: true });
    return res.json({ ok: true, session_id: session.id, reply: CRISIS_REPLY, crisis: true });
  }
  if (session.turns >= MAX_TURNS) {
    return res.json({ ok: true, session_id: session.id, reply: `We've covered a lot! To keep going, Yo's team would love to help directly: ${URL('contact/')}` });
  }
  if (!hasCredentials()) return res.status(503).json({ ok: false, offline: true, session_id: session.id, message: 'Agent Yo is in guided mode.' });

  messages.push({ role: 'user', content: message });
  if (session.locked) messages.push({ role: 'system', content: CRISIS_NOTE });

  let reply = '', modeFromTool = '';
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await getClient().beta.messages.create({
        model: MODEL,
        max_tokens: 16000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',             // a declined request is retried on Anthropic's recommended fallback model
        output_config: { effort: EFFORT },
        cache_control: { type: 'ephemeral' },
        system: systemPrompt(),
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'refusal') {
        reply = `I can't help with that one here, but Yo's team can point you in the right direction: ${URL('contact/')}`;
        messages.push({ role: 'assistant', content: reply }); // keep history in valid order
        break;
      }
      messages.push({ role: 'assistant', content: response.content }); // append unchanged (keeps thinking blocks valid)

      if (response.stop_reason === 'pause_turn') continue;
      if (response.stop_reason === 'tool_use') {
        const results = response.content.filter((b) => b.type === 'tool_use').map((t) => {
          if (t.name === 'save_lead' && t.input?.mode) modeFromTool = t.input.mode;
          const out = runTool(t.name, t.input || {}, db.prepare(`SELECT * FROM agent_sessions WHERE id = ?`).get(session.id));
          return { type: 'tool_result', tool_use_id: t.id, content: JSON.stringify(out), ...(out.ok ? {} : { is_error: true }) };
        });
        messages.push({ role: 'user', content: results }); // all results in one message
        if (round === MAX_TOOL_ROUNDS) { reply = textOf(response.content) || `Let me hand you to the team: ${URL('contact/')}`; break; }
        continue;
      }
      reply = textOf(response.content);
      break;
    }
  } catch (err) {
    // Roll back to the last saved history (don't keep a turn the model never answered)
    messages.length = 0; messages.push(...JSON.parse(session.messages || '[]'));
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      console.error('[agent] credentials rejected:', err.message);
      return res.status(503).json({ ok: false, offline: true, session_id: session.id, message: 'Agent Yo is in guided mode.' });
    }
    if (err instanceof Anthropic.RateLimitError) return res.status(429).json({ ok: false, session_id: session.id, message: 'Agent Yo is very busy right now. Please try again in a minute.' });
    console.error('[agent]', err instanceof Anthropic.APIError ? `${err.status} ${err.message}` : err.message);
    return res.status(502).json({ ok: false, session_id: session.id, message: `Something went wrong on my side. You can always reach Yo's team at ${URL('contact/')}` });
  }

  if (!reply) reply = `I'm here to help you plan an event, test a business idea, or reach Yo's team. What would you like to do?`;
  saveSession(session, messages, { first: firstUser, mode: modeFromTool || (session.mode ? '' : guessMode(message)) });
  res.json({ ok: true, session_id: session.id, reply });
});

// ---------------- POST /api/agent/forget ----------------
router.post('/agent/forget', (req, res) => {
  const id = String(req.body?.session_id || '');
  if (!/^[a-zA-Z0-9-]{16,64}$/.test(id)) return res.status(400).json({ ok: false, message: 'Unknown conversation.' });
  db.prepare(`DELETE FROM agent_gaps WHERE session_id = ?`).run(id);
  const { changes } = db.prepare(`DELETE FROM agent_sessions WHERE id = ?`).run(id);
  res.json({ ok: true, deleted: changes > 0 });
});

// ---------------- Admin analytics ----------------
function agentAnalytics() {
  const one = (sql) => db.prepare(sql).get();
  const total = one(`SELECT COUNT(*) n FROM agent_sessions WHERE turns > 0`).n;
  const leads = one(`SELECT COUNT(*) n FROM agent_sessions WHERE lead_id IS NOT NULL`).n;
  const dropoff = one(`SELECT COUNT(*) n FROM agent_sessions WHERE turns = 1`).n;
  return {
    ok: true,
    sessions: total,
    leads,
    conversion_rate: total ? Math.round((leads / total) * 1000) / 10 : 0,
    dropoff_rate: total ? Math.round((dropoff / total) * 1000) / 10 : 0,
    crisis_redirects: one(`SELECT COUNT(*) n FROM agent_sessions WHERE locked = 1`).n,
    by_mode: db.prepare(`SELECT COALESCE(NULLIF(mode, ''), 'unknown') mode, COUNT(*) n FROM agent_sessions WHERE turns > 0 GROUP BY 1 ORDER BY n DESC`).all(),
    top_questions: db.prepare(`SELECT lower(first_message) question, COUNT(*) n FROM agent_sessions WHERE first_message != '' GROUP BY 1 ORDER BY n DESC LIMIT 10`).all(),
    pages: db.prepare(`SELECT COALESCE(NULLIF(page, ''), '/') page, COUNT(*) n FROM agent_sessions WHERE turns > 0 GROUP BY 1 ORDER BY n DESC LIMIT 10`).all(),
    content_gaps: db.prepare(`SELECT question, topic, created_at FROM agent_gaps ORDER BY id DESC LIMIT 25`).all(),
  };
}
router.get('/agent/analytics', requireAdmin, (req, res) => res.json(agentAnalytics()));

function agentTranscripts() {
  const rows = db.prepare(`SELECT id, page, mode, turns, lead_id, locked, messages, created_at, updated_at FROM agent_sessions WHERE turns > 0 ORDER BY updated_at DESC LIMIT 50`).all();
  return rows.map(({ messages, ...r }) => ({
    ...r,
    transcript: JSON.parse(messages || '[]').filter((m) => m.role !== 'system').map((m) => ({ role: m.role, text: textOf(m.content) })).filter((m) => m.text),
  }));
}
router.get('/agent/sessions', requireAdmin, (req, res) => res.json({ ok: true, data: agentTranscripts() }));

module.exports = router;
module.exports.agentAnalytics = agentAnalytics;
module.exports.agentTranscripts = agentTranscripts;

// Test hook: swap in a stand-in client (used by scripts/test-agent.js; never in production)
module.exports._setClient = (c) => { client = c; };
