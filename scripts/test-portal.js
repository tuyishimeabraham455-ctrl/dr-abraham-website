// ============================================================
//  Portal API test: roles, messaging, community, resources,
//  CRM and user management. Run: node scripts/test-portal.js
//  Uses a throwaway database.
// ============================================================
const path = require('path');
const os = require('os');
const fs = require('fs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'portal-test-'));
process.env.DB_PATH = path.join(tmp, 'test.db');

const express = require('express');
const db = require('../database/db');
const m = require('../lib/members');

let pass = 0, fail = 0;
const check = (name, cond, extra = '') => { cond ? pass++ : fail++; console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? '  · ' + extra : ''}`); };

const app = express();
app.use(express.json());
app.use('/api', require('../routes/api'));
app.use('/api', require('../routes/portal'));
const server = app.listen(0);
const base = `http://127.0.0.1:${server.address().port}/api`;
const call = async (method, p, token, body) => {
  const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const ct = r.headers.get('content-type') || '';
  return { status: r.status, ct, body: ct.includes('json') ? await r.json() : await r.text() };
};
const mk = (name, email, role) => db.prepare(`INSERT INTO members (name, email, password, role) VALUES (?, ?, ?, ?)`).run(name, email, m.hashPassword('password-123'), role).lastInsertRowid;
const login = async (email, password = 'password-123') => (await call('POST', '/members/login', null, { email, password })).body;

(async () => {
  try {
    const adminId = mk('Yo Admin', 'admin@example.com', 'admin');
    const teamId = mk('Team Mate', 'team@example.com', 'team');
    const m1 = mk('Member One', 'one@example.com', 'member');
    const m2 = mk('Member Two', 'two@example.com', 'member');
    const A = (await login('admin@example.com')).token, T = (await login('team@example.com')).token;
    const M1 = (await login('one@example.com')).token, M2 = (await login('two@example.com')).token;
    const loginOut = await login('admin@example.com');
    check('login returns role', loginOut.member.role === 'admin');

    // Access control
    check('no token -> 401', (await call('GET', '/portal/me')).status === 401);
    check('member blocked from CRM overview (403)', (await call('GET', '/portal/overview', M1)).status === 403);
    check('member blocked from leads (403)', (await call('GET', '/portal/leads', M1)).status === 403);
    check('team blocked from user management (403)', (await call('GET', '/portal/users', T)).status === 403);
    const ov = await call('GET', '/portal/overview', T);
    check('team sees CRM overview', ov.status === 200 && ov.body.kpis && 'hot_leads' in ov.body.kpis && ov.body.agent.ok);

    // Messaging
    check('member cannot message another member (403)', (await call('POST', '/portal/messages', M1, { to_id: m2, subject: 'hi', body: 'hey' })).status === 403);
    const people = (await call('GET', '/portal/people', M1)).body.data;
    check('member directory lists only the team', people.length === 2 && people.every((p) => ['admin', 'team'].includes(p.role)));
    const sent = await call('POST', '/portal/messages', M1, { to_id: teamId, subject: 'Question about the Lab', body: 'When does it start?' });
    check('member messages the team', sent.status === 201);
    check('team has 1 unread', (await call('GET', '/portal/me', T)).body.unread === 1);
    const open = await call('GET', `/portal/messages/${sent.body.id}`, T);
    check('team opens it; marked read', open.body.data.length === 1 && (await call('GET', '/portal/me', T)).body.unread === 0);
    await call('POST', '/portal/messages', T, { to_id: m1, subject: 'Re: Question about the Lab', body: 'Dates go to the waitlist first.', thread_id: sent.body.id });
    const thread = await call('GET', `/portal/messages/${sent.body.id}`, M1);
    check('reply lands in the same thread', thread.body.data.length === 2);
    check('outsider cannot read the thread (404)', (await call('GET', `/portal/messages/${sent.body.id}`, M2)).status === 404);
    const bc = await call('POST', '/portal/broadcast', A, { subject: 'Welcome', body: 'Hello everyone' });
    check('admin broadcast reaches everyone else', bc.body.ok && /3 people/.test(bc.body.message));
    check('team cannot broadcast (403)', (await call('POST', '/portal/broadcast', T, { subject: 'x', body: 'y' })).status === 403);

    // Community
    const post = await call('POST', '/portal/community', M1, { body: 'My first win this week!' });
    await call('POST', `/portal/community/${post.body.id}/comments`, M2, { body: 'Congrats!' });
    const feed = (await call('GET', '/portal/community', M2)).body.data;
    check('post + comment visible to members', feed[0].body.includes('first win') && feed[0].comments.length === 1 && feed[0].mine === false);
    check('member cannot delete someone else\'s post (403)', (await call('DELETE', `/portal/community/${post.body.id}`, M2)).status === 403);
    check('member cannot pin (403)', (await call('POST', `/portal/community/${post.body.id}/pin`, M1)).status === 403);
    check('staff can pin', (await call('POST', `/portal/community/${post.body.id}/pin`, T)).body.ok === true);
    check('author can delete own post', (await call('DELETE', `/portal/community/${post.body.id}`, M1)).body.ok === true);

    // Resources
    check('member cannot add resources (403)', (await call('POST', '/portal/resources', M1, { title: 'x', url: 'https://x.com' })).status === 403);
    check('unsafe link rejected', (await call('POST', '/portal/resources', T, { title: 'Bad', url: 'javascript:alert(1)' })).status === 400);
    await call('POST', '/portal/resources', T, { title: 'Team playbook', url: 'https://example.com/playbook', audience: 'team' });
    await call('POST', '/portal/resources', T, { title: 'Member workbook', url: '/learn/workbook/', audience: 'member', kind: 'Workbook' });
    const memRes = (await call('GET', '/portal/resources', M1)).body.data.map((r) => r.title);
    check('members see member resources, not team-only', memRes.includes('Member workbook') && !memRes.includes('Team playbook'));
    check('team sees everything', (await call('GET', '/portal/resources', T)).body.data.length === 2);

    // CRM: leads, subscribers
    db.prepare(`INSERT INTO inquiries (name, email, message, score) VALUES ('Dana', 'dana@example.com', 'Conference', 80)`).run();
    db.prepare(`INSERT INTO subscribers (email, source) VALUES ('fan@example.com', 'workbook')`).run();
    const leads = (await call('GET', '/portal/leads?q=dana', T)).body.data;
    check('lead search', leads.length === 1 && leads[0].score === 80);
    check('lead status update', (await call('PATCH', `/portal/leads/${leads[0].id}`, T, { status: 'replied' })).body.ok);
    check('invalid status rejected', (await call('PATCH', `/portal/leads/${leads[0].id}`, T, { status: 'hacked' })).status === 400);
    const csv = await call('GET', '/portal/subscribers?format=csv', T);
    check('subscribers CSV export', csv.ct.includes('text/csv') && csv.body.includes('fan@example.com'));

    // Users
    const created = await call('POST', '/portal/users', A, { name: 'New Student', email: 'new@example.com', role: 'member' });
    check('admin creates account with temporary password', created.status === 201 && created.body.temp_password.length >= 10);
    const newLogin = await login('new@example.com', created.body.temp_password);
    check('new user can sign in', newLogin.ok && newLogin.member.role === 'member');
    check('duplicate email rejected (409)', (await call('POST', '/portal/users', A, { name: 'Dup', email: 'new@example.com' })).status === 409);
    check('last admin cannot demote self', (await call('PATCH', `/portal/users/${adminId}`, A, { role: 'member' })).status === 400);
    await call('PATCH', `/portal/users/${m2}`, A, { status: 'paused' });
    check('paused user signed out and blocked', (await call('GET', '/portal/me', M2)).status === 401 && !(await login('two@example.com')).ok);

    // Password change signs out other sessions
    const second = (await login('one@example.com')).token;
    check('wrong current password rejected', (await call('POST', '/portal/password', M1, { current: 'nope', next: 'a-much-longer-password' })).status === 400);
    check('password changed', (await call('POST', '/portal/password', M1, { current: 'password-123', next: 'a-much-longer-password' })).body.ok);
    check('other session signed out; this one kept', (await call('GET', '/portal/me', second)).status === 401 && (await call('GET', '/portal/me', M1)).status === 200);
  } catch (e) {
    fail++; console.log('FAIL  test crashed: ' + e.stack);
  } finally {
    server.close(); db.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(fail ? 1 : 0);
  }
})();
