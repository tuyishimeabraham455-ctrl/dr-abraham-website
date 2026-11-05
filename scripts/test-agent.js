// ============================================================
//  Agent Yo backend test with a simulated Claude client.
//  Run: node scripts/test-agent.js
//  Uses a throwaway database; makes no real API calls.
// ============================================================
const path = require('path');
const os = require('os');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');
process.env.ANTHROPIC_API_KEY = 'test-key-not-real';
process.env.SITE_URL = 'http://localhost:3999';

const express = require('express');
const agent = require('../routes/agent');
const db = require('../database/db');

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };

// ---- Simulated Claude client: returns scripted responses, records requests ----
const requests = [];
let script = [];
const fake = { beta: { messages: { create: async (params) => {
  requests.push(JSON.parse(JSON.stringify(params)));
  const next = script.shift();
  if (!next) throw new Error('script exhausted');
  return next(params);
} } } };
agent._setClient(fake);
const text = (t) => () => ({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '', signature: 'sig' }, { type: 'text', text: t }] });
const toolUse = (name, input, id = 'tu_' + Math.random().toString(36).slice(2)) => () => ({ stop_reason: 'tool_use', content: [{ type: 'text', text: 'One moment.' }, { type: 'tool_use', id, name, input }] });

const app = express();
app.use(express.json());
app.use('/api', agent);
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const post = async (p, body) => { const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); return { status: r.status, body: await r.json() }; };
const get = async (p) => (await fetch(base + p)).json();

(async () => {
  try {
    // 1. First turn: plain answer
    script = [text('Wonderful! Tell me about your audience. https://example.com/speaking/')];
    let r = await post('/agent/chat', { message: 'I\'m planning a conference for 300 people in March', page: '/speaking/' });
    const sid = r.body.session_id;
    check('turn 1 replies', r.status === 200 && r.body.ok && r.body.reply.includes('Wonderful'));
    const req1 = requests[0];
    check('model is claude-opus-5-5', req1.model === 'claude-opus-5-5');
    check('refusal fallbacks on ("default" + 2026-07-01 beta)', req1.fallbacks === 'default' && req1.betas.includes('server-side-fallback-2026-07-01'));
    check('effort set explicitly', req1.output_config && req1.output_config.effort === 'medium');
    check('prompt caching on', req1.cache_control && req1.cache_control.type === 'ephemeral');
    check('all tools strict with closed schemas', req1.tools.length === 4 && req1.tools.every((t) => t.strict === true && t.input_schema.additionalProperties === false));
    check('no forced tool_choice, no thinking:disabled', !('tool_choice' in req1) && !('thinking' in req1));
    check('system prompt carries the knowledge base', req1.system.includes('Credit, Capital & Confidence') && req1.system.includes('Never quote a fee'));

    // 2. save_lead without consent is rejected by code
    script = [toolUse('save_lead', { mode: 'planner', name: 'Dana', email: 'dana@example.com', organization: '', event_type: 'Conference', event_date: '2027-03-18', audience_size: '200 to 500', budget: '$5,000 to $10,000', decision_maker: 'Yes, I decide', goals: 'Money confidence', recommended_talk: 'credit-capital-confidence', consent_confirmed: false }), text('Before I send anything, may I share your details with Yo\'s team?')];
    r = await post('/agent/chat', { session_id: sid, message: 'My name is Dana, dana@example.com' });
    const toolResult1 = requests.at(-1).messages.at(-1).content[0];
    check('save_lead without consent -> tool error, nothing saved', toolResult1.is_error === true && /Consent/.test(toolResult1.content) && db.prepare(`SELECT COUNT(*) n FROM inquiries`).get().n === 0);

    // 3. With consent: lead saved, scored, session linked
    script = [toolUse('save_lead', { mode: 'planner', name: 'Dana Planner', email: 'dana@example.com', organization: 'Bay Area CU', event_type: 'Conference', event_date: '2027-03-18', audience_size: '200 to 500', budget: '$5,000 to $10,000', decision_maker: 'Yes, I decide', goals: 'Money confidence', recommended_talk: 'credit-capital-confidence', consent_confirmed: true }), text('Done! Yo\'s team will reply within one business day.')];
    r = await post('/agent/chat', { session_id: sid, message: 'Yes, please send it' });
    const lead = db.prepare(`SELECT * FROM inquiries ORDER BY id DESC LIMIT 1`).get();
    check('lead saved from Agent Yo', lead && lead.source === 'agent' && lead.inquiry_type === 'Agent Yo · planner', lead && `score ${lead.score}`);
    const sess = db.prepare(`SELECT * FROM agent_sessions WHERE id = ?`).get(sid);
    check('session linked to lead, mode planner', sess.lead_id === lead.id && sess.mode === 'planner');
    check('confirmation email queued', db.prepare(`SELECT COUNT(*) n FROM outbox WHERE kind = 'confirmation'`).get().n === 1);
    const tr = JSON.parse(requests.at(-1).messages.at(-1).content[0].content);
    check('tool result returns pre-filled booking link', tr.saved && tr.booking_link.includes('book/?talk=credit-capital-confidence'));

    // 4. Slots + booking a call through the agent
    let slotsOut;
    script = [toolUse('get_call_slots', {}), (params) => { slotsOut = JSON.parse(params.messages.at(-1).content[0].content); return text('I have Tuesday at 10am. Shall I book it?')(); }];
    await post('/agent/chat', { session_id: sid, message: 'Can we talk this week?' });
    check('get_call_slots returns open times', slotsOut && slotsOut.ok && slotsOut.slots.length > 0, slotsOut && slotsOut.slots[0].label);
    script = [toolUse('book_discovery_call', { name: 'Dana Planner', email: 'dana@example.com', starts_at: slotsOut.slots[0].starts_at, consent_confirmed: true }), text('Booked!')];
    await post('/agent/chat', { session_id: sid, message: 'Yes, book the first one' });
    const call = db.prepare(`SELECT * FROM calls`).get();
    check('discovery call booked and linked to lead', call && call.starts_at === slotsOut.slots[0].starts_at && call.inquiry_id === lead.id);

    // 5. History is append-only and alternates validly; thinking blocks kept unchanged
    const hist = JSON.parse(db.prepare(`SELECT messages FROM agent_sessions WHERE id = ?`).get(sid).messages);
    const sameAsSent = JSON.stringify(requests.at(-1).messages) === JSON.stringify(hist.slice(0, requests.at(-1).messages.length));
    check('stored history = what was sent (append-only)', sameAsSent, `${hist.length} messages`);
    check('thinking blocks preserved in history', hist.some((m) => Array.isArray(m.content) && m.content.some((b) => b.type === 'thinking' && b.signature === 'sig')));

    // 6. Refusal keeps history valid
    script = [() => ({ stop_reason: 'refusal', content: [], stop_details: { type: 'refusal', category: null } })];
    r = await post('/agent/chat', { session_id: sid, message: 'something declined' });
    const h2 = JSON.parse(db.prepare(`SELECT messages FROM agent_sessions WHERE id = ?`).get(sid).messages);
    check('refusal -> polite handoff, history ends with assistant', r.body.reply.includes('contact') && h2.at(-1).role === 'assistant');

    // 7. Crisis: no model call, session locked, later turns get the operator note and no sales tools
    const before = requests.length;
    r = await post('/agent/chat', { session_id: sid, message: 'honestly I want to end my life' });
    check('crisis reply without calling the model', r.body.crisis === true && r.body.reply.includes('988') && requests.length === before);
    script = [toolUse('save_lead', { mode: 'planner', name: 'Dana', email: 'dana@example.com', organization: '', event_type: '', event_date: '', audience_size: '', budget: '', decision_maker: '', goals: '', recommended_talk: '', consent_confirmed: true }), text('I\'m here with you.')];
    await post('/agent/chat', { session_id: sid, message: 'ok' });
    const lockedReq = requests.at(-2);
    check('locked: operator system note sent after user turn', lockedReq.messages.at(-1).role === 'system' && /distress/.test(lockedReq.messages.at(-1).content));
    const blocked = JSON.parse(requests.at(-1).messages.at(-1).content[0].content);
    check('locked: save_lead blocked in code', blocked.ok === false && db.prepare(`SELECT COUNT(*) n FROM inquiries`).get().n === 1);

    // 8. API error rolls history back
    const len = JSON.parse(db.prepare(`SELECT messages FROM agent_sessions WHERE id = ?`).get(sid).messages).length;
    script = [() => { throw new Error('boom'); }];
    r = await post('/agent/chat', { session_id: sid, message: 'hello?' });
    check('API error -> 502 + history unchanged', r.status === 502 && JSON.parse(db.prepare(`SELECT messages FROM agent_sessions WHERE id = ?`).get(sid).messages).length === len);

    // 9. Content gap logging, analytics, forget
    script = [toolUse('log_content_gap', { question: 'Does Yo speak in Spanish?', topic: 'language' }), text('Good question, I\'ll pass it to the team.')];
    const r2 = await post('/agent/chat', { message: 'Does Yo speak in Spanish?' });
    const a = await get('/agent/analytics');
    check('analytics: sessions, conversion, gaps, pages', a.ok && a.sessions === 2 && a.leads === 1 && a.conversion_rate === 50 && a.content_gaps[0].topic === 'language' && a.pages.some((p) => p.page === '/speaking/'), `conversion ${a.conversion_rate}%`);
    const f = await post('/agent/forget', { session_id: r2.body.session_id });
    check('forget deletes the conversation', f.body.deleted === true && !db.prepare(`SELECT 1 FROM agent_sessions WHERE id = ?`).get(r2.body.session_id));

    // 10. Without credentials: the local brain answers (no AI service)
    delete process.env.ANTHROPIC_API_KEY;
    r = await post('/agent/chat', { message: 'hi' });
    check('no API key -> local brain answers', r.status === 200 && r.body.ok && r.body.local === true && /Agent Yo/.test(r.body.reply));
    r = await post('/agent/chat', { message: 'How much does Yo charge for a keynote?' });
    check('local: never quotes a fee', r.body.local && !/\$\s?\d/.test(r.body.reply) && /quote/i.test(r.body.reply) && r.body.chips.some((c) => c.href === '/book/'));
    r = await post('/agent/chat', { message: 'Does Yo work with churches?' });
    check('local: answers from Yo\'s material with next-step buttons', /church/i.test(r.body.reply) && r.body.chips.length >= 2);
    r = await post('/agent/chat', { message: 'I want to book Yo for our conference' });
    check('local: booking intent offers the guided planner', r.body.chips.some((c) => c.mode === 'planner'));
    r = await post('/agent/chat', { message: 'can you help with my taxes' });
    check('local: education, not tax advice', /licensed professional/i.test(r.body.reply));
    r = await post('/agent/chat', { message: 'I want to end my life' });
    check('local: crisis redirect still comes first', r.body.crisis === true && /988/.test(r.body.reply));
    const gapsBefore = db.prepare(`SELECT COUNT(*) n FROM agent_gaps`).get().n;
    r = await post('/agent/chat', { message: 'what is the capital of Mongolia' });
    check('local: unknown question is honest and logged for training', r.body.local && /still learning/i.test(r.body.reply) && db.prepare(`SELECT COUNT(*) n FROM agent_gaps`).get().n === gapsBefore + 1);
    db.prepare(`INSERT INTO agent_training (questions, answer, link, link_label) VALUES (?, ?, ?, ?)`).run('Do you offer payment plans?\nCan I pay in installments?', 'Yes. Programs can be paid in three monthly installments.', '/learn/', 'See programs');
    require('../lib/local-agent').refreshTraining();
    r = await post('/agent/chat', { message: 'can i pay in installments' });
    check('local: taught answers are used straight away', /three monthly installments/.test(r.body.reply) && r.body.source === 'taught' && r.body.chips[0].href === '/learn/');
  } catch (e) {
    fail++; console.log('FAIL  test crashed: ' + e.stack);
  } finally {
    server.close(); db.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(fail ? 1 : 0);
  }
})();
