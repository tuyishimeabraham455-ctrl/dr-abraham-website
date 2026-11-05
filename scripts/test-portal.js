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
const coachRoutes = require('../routes/coach');
app.use('/api', coachRoutes);
app.use('/api', require('../routes/media'));
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

    // Assignments
    const asg = await call('POST', '/portal/assignments', A, { title: 'Record your signature story', details: 'Two minutes, phone video is fine.', assigned_to: m1, due_date: '2020-01-01' });
    check('staff creates assignment', asg.status === 201 && asg.body.ok);
    check('member cannot create assignments', (await call('POST', '/portal/assignments', M1, { title: 'x', assigned_to: teamId })).status === 403);
    check('bad due date rejected', (await call('POST', '/portal/assignments', A, { title: 'x', assigned_to: m1, due_date: 'soon' })).status === 400);
    const meM1 = (await call('GET', '/portal/me', M1)).body;
    check('assignee sees open-assignment badge', meM1.open_assignments === 1);
    check('assignee gets an inbox note', (await call('GET', '/portal/messages', M1)).body.data.some((x) => x.subject.startsWith('New assignment')));
    const listM1 = (await call('GET', '/portal/assignments', M1)).body.data;
    check('member sees only their own assignments', listM1.length === 1 && listM1[0].assigned_to === m1);
    const other = await call('POST', '/portal/assignments', A, { title: 'Team task', assigned_to: teamId });
    check('member cannot open someone else\'s assignment', (await call('PATCH', `/portal/assignments/${other.body.id}`, M1, { status: 'in_progress' })).status === 404);
    check('member cannot mark own work done', (await call('PATCH', `/portal/assignments/${asg.body.id}`, M1, { status: 'done' })).status === 403);
    check('empty submission rejected', (await call('PATCH', `/portal/assignments/${asg.body.id}`, M1, { status: 'submitted', submission: ' ' })).status === 400);
    check('member submits work', (await call('PATCH', `/portal/assignments/${asg.body.id}`, M1, { status: 'submitted', submission: 'https://example.com/my-story' })).body.ok);
    check('assigner notified of submission', (await call('GET', '/portal/messages', A)).body.data.some((x) => x.subject.startsWith('Submitted:')));
    check('staff marks needs changes with feedback', (await call('PATCH', `/portal/assignments/${asg.body.id}`, A, { status: 'needs_changes', feedback: 'Open with the preschool story.' })).body.ok);
    check('member notified of feedback', (await call('GET', '/portal/messages', M1)).body.data.some((x) => x.subject.startsWith('Needs changes:')));
    const ovA = (await call('GET', '/portal/overview', A)).body.kpis;
    check('overview counts open assignments', ovA.open_assignments === 2 && ovA.to_review === 0);

    // AI Coach
    const coach = (await call('GET', '/portal/coach', A)).body;
    check('coach briefing works without an API key', coach.ok && coach.ai === false && coach.suggestions.length > 0);
    check('coach flags overdue assignment', coach.suggestions.some((s) => s.area === 'Team' && /overdue/.test(s.title)));
    check('members cannot open the coach', (await call('GET', '/portal/coach', M1)).status === 403);
    check('coach ask offline -> 503 offline', (await call('POST', '/portal/coach/ask', A, { question: 'What should I focus on?' })).body.offline === true);
    process.env.ANTHROPIC_API_KEY = 'test';
    let seen = null;
    coachRoutes._setClient({ beta: { messages: { create: async (req) => { seen = req; return { stop_reason: 'end_turn', content: [{ type: 'text', text: '**Focus:** reply to your hot leads first.' }] }; } } } });
    const asked = await call('POST', '/portal/coach/ask', A, { question: 'What should I focus on?', history: [{ role: 'assistant', text: 'stray' }, { role: 'user', text: 'Hi' }, { role: 'assistant', text: 'Hello!' }] });
    check('coach answers with Claude', asked.body.ok && asked.body.answer.includes('hot leads'));
    check('coach request: model, live data, valid history', seen.model === 'claude-opus-5-5' && seen.system.includes('<business_data') && seen.system.includes('Record your signature story') && seen.messages.map((x) => x.role).join() === 'user,assistant,user');
    delete process.env.ANTHROPIC_API_KEY;

    // Self sign-up
    const reg = await call('POST', '/members/register', null, { name: 'Self Starter', email: 'Self@Example.com', password: 'long-enough-pw', role: 'admin' });
    check('anyone can create an account and is signed in', reg.status === 201 && reg.body.token && reg.body.member.email === 'self@example.com');
    check('sign-up always makes a member (role ignored)', reg.body.member.role === 'member');
    check('new account can open the portal', (await call('GET', '/portal/me', reg.body.token)).status === 200);
    check('new account cannot open staff pages', (await call('GET', '/portal/overview', reg.body.token)).status === 403);
    check('duplicate sign-up email -> 409', (await call('POST', '/members/register', null, { name: 'Again', email: 'self@example.com', password: 'long-enough-pw' })).status === 409);
    check('short password rejected', (await call('POST', '/members/register', null, { name: 'Short', email: 'short@example.com', password: 'short' })).status === 400);
    check('bot honeypot rejected', (await call('POST', '/members/register', null, { name: 'Bot', email: 'bot@example.com', password: 'long-enough-pw', website: 'spam.example' })).status === 400);
    check('new member can sign in with their password', (await login('self@example.com', 'long-enough-pw')).ok);
    check('admins told about the new member', (await call('GET', '/portal/messages', A)).body.data.some((x) => x.subject === 'New member: Self Starter'));

    // Profile pictures
    const upload = async (p, token, bytes, type) => { const r = await fetch(base + p, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': type }, body: bytes }); return { status: r.status, body: await r.json() }; };
    const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
    const av = await upload('/portal/me/avatar', M1, PNG, 'image/png');
    check('member uploads a profile picture', av.status === 200 && /^\/uploads\/avatars\/[a-f0-9]{24}\.png$/.test(av.body.avatar));
    check('picture file saved on disk', fs.existsSync(path.join(tmp, 'uploads', 'avatars', path.basename(av.body.avatar))));
    check('picture shows on /portal/me', (await call('GET', '/portal/me', M1)).body.member.avatar === av.body.avatar);
    check('non-image rejected even if labelled image', (await upload('/portal/me/avatar', M1, Buffer.from('<script>alert(1)</script>'), 'image/png')).status === 415);
    check('picture without sign-in -> 401', (await upload('/portal/me/avatar', '', PNG, 'image/png')).status === 401);
    const av2 = await upload('/portal/me/avatar', M1, PNG, 'image/png');
    check('replacing a picture deletes the old file', av2.status === 200 && await new Promise((r) => setTimeout(() => r(!fs.existsSync(path.join(tmp, 'uploads', 'avatars', path.basename(av.body.avatar)))), 200)));
    check('admin sees pictures in the user list', (await call('GET', '/portal/users', A)).body.data.find((u) => u.id === m1).avatar === av2.body.avatar);
    check('admin removes someone\'s picture', (await call('DELETE', `/portal/users/${m1}/avatar`, A)).body.ok && !(await call('GET', '/portal/me', M1)).body.member.avatar);

    // Admin controls every account
    check('admin edits a name and email', (await call('PATCH', `/portal/users/${m1}`, A, { name: 'Member Uno', email: 'uno@example.com' })).body.ok && (await call('GET', '/portal/me', M1)).body.member.email === 'uno@example.com');
    check('email already used -> 409', (await call('PATCH', `/portal/users/${m1}`, A, { email: 'team@example.com' })).status === 409);
    check('members cannot edit accounts', (await call('PATCH', `/portal/users/${m1}`, M1, { role: 'admin' })).status === 403);
    const doomed = (await call('POST', '/portal/users', A, { name: 'Leaving Soon', email: 'leaving@example.com' })).body;
    const doomedId = (await call('GET', '/portal/users', A)).body.data.find((u) => u.email === 'leaving@example.com').id;
    check('admin deletes an account', doomed.ok && (await call('DELETE', `/portal/users/${doomedId}`, A)).body.ok && !(await login('leaving@example.com', doomed.temp_password)).ok);
    check('admin cannot delete their own account', (await call('DELETE', `/portal/users/${adminId}`, A)).status === 400);

    // Site settings: background videos and announcement
    check('public settings start empty', (await call('GET', '/settings')).body.hero_video === null);
    check('members cannot change site settings', (await call('PUT', '/portal/settings', M1, { hero_video: 'https://youtu.be/dQw4w9WgXcQ' })).status === 403);
    const yt = await call('PUT', '/portal/settings', A, { hero_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', video_strength: 60 });
    check('admin sets a YouTube background video', yt.body.ok && yt.body.view.hero_video.kind === 'youtube' && yt.body.view.hero_video.id === 'dQw4w9WgXcQ');
    check('Vimeo and .mp4 links recognised', (await call('PUT', '/portal/settings', A, { page_video: 'https://vimeo.com/76979871' })).body.view.page_video.kind === 'vimeo'
      && (await call('PUT', '/portal/settings', A, { page_video: 'https://cdn.example.com/loop.mp4?x=1' })).body.view.page_video.kind === 'file');
    check('not-a-video link rejected with a helpful message', /YouTube or Vimeo/.test((await call('PUT', '/portal/settings', A, { hero_video: 'just some words' })).body.message));
    const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypisom'), Buffer.alloc(256)]);
    const vid = await upload('/portal/settings/video?slot=hero_video', A, MP4, 'video/mp4');
    check('admin uploads a background video', vid.status === 200 && vid.body.view.hero_video.kind === 'file' && /^\/uploads\/videos\//.test(vid.body.view.hero_video.src));
    check('members cannot upload videos', (await upload('/portal/settings/video?slot=hero_video', M1, MP4, 'video/mp4')).status === 403);
    check('a picture is not accepted as a video', (await upload('/portal/settings/video?slot=hero_video', A, PNG, 'video/mp4')).status === 415);
    await call('PUT', '/portal/settings', A, { announce_on: true, announce_text: 'Live in Oakland, March 12', announce_link: '/events/' });
    const pub = (await call('GET', '/settings')).body;
    check('website reads video, strength and announcement', pub.hero_video.kind === 'file' && pub.video_strength === 60 && pub.announce.text === 'Live in Oakland, March 12');
    check('unsafe announcement link rejected', (await call('PUT', '/portal/settings', A, { announce_link: 'javascript:alert(1)' })).status === 400);

    // Media library (Watch page, About page)
    const JPG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
    const ph = await upload('/portal/uploads?kind=photos', A, JPG, 'image/jpeg');
    check('admin uploads a photo', ph.status === 201 && /^\/uploads\/photos\/[a-f0-9]{24}\.jpg$/.test(ph.body.url));
    check('members cannot upload to the library', (await upload('/portal/uploads?kind=photos', M1, JPG, 'image/jpeg')).status === 403);
    const addPh = await call('POST', '/portal/media', A, { kind: 'photo', src: ph.body.url, title: 'On stage in Oakland', show_on: ['about', 'watch'] });
    check('admin adds a photo to the gallery', addPh.status === 201);
    const addV = await call('POST', '/portal/media', A, { kind: 'video', title: 'Keynote highlights', category: 'Keynotes', src: 'https://youtu.be/dQw4w9WgXcQ', featured: true, show_on: ['watch', 'about'] });
    check('admin adds a featured YouTube video', addV.status === 201);
    await call('POST', '/portal/media', A, { kind: 'video', title: 'Interview', category: 'Interviews', src: 'https://vimeo.com/76979871', show_on: ['watch'] });
    check('a video without a title is refused', (await call('POST', '/portal/media', A, { kind: 'video', src: 'https://youtu.be/dQw4w9WgXcQ' })).status === 400);
    check('an unplayable link is refused', (await call('POST', '/portal/media', A, { kind: 'video', title: 'x', src: 'hello' })).status === 400);
    check('members cannot add media', (await call('POST', '/portal/media', M1, { kind: 'photo', src: ph.body.url })).status === 403);
    const watchList = (await call('GET', '/media?on=watch')).body.data;
    check('Watch page gets videos and photos, featured first', watchList.length === 3 && watchList[0].featured && watchList[0].video.kind === 'youtube' && watchList[0].thumb.includes('ytimg'));
    const aboutList = (await call('GET', '/media?on=about')).body.data;
    check('About page only gets items placed there', aboutList.length === 2 && !aboutList.some((x) => x.title === 'Interview'));
    const vid2 = (await call('GET', '/portal/media', A)).body.data.find((x) => x.title === 'Interview');
    await call('PATCH', `/portal/media/${vid2.id}`, A, { featured: true });
    check('making a video featured replaces the old featured one', (await call('GET', '/media?on=watch')).body.data.filter((x) => x.featured).map((x) => x.title).join() === 'Interview');
    const phItem = (await call('GET', '/portal/media', A)).body.data.find((x) => x.kind === 'photo');
    await call('DELETE', `/portal/media/${phItem.id}`, A);
    check('deleting a photo removes the file', await new Promise((r) => setTimeout(() => r(!fs.existsSync(path.join(tmp, 'uploads', 'photos', path.basename(ph.body.url)))), 200)));

    // Live page editing
    const ed = await call('PUT', '/portal/content', A, { path: '/about/', items: [
      { key: 't:h1:abc~1', kind: 'text', value: 'Hello <em class="x" onclick="evil()">world</em><script>alert(1)</script><img src=x onerror=alert(1)>' },
      { key: 'i:xyz~1', kind: 'image', value: '/uploads/photos/0123456789abcdef01234567.jpg' },
    ] });
    check('admin saves page edits', ed.body.ok && ed.body.saved === 2);
    const content = (await call('GET', '/content?path=/about/')).body.data;
    check('edited text keeps italics but loses scripts and attributes', content['t:h1:abc~1'].value === 'Hello <em>world</em>');
    check('replaced photo is saved', content['i:xyz~1'].value.startsWith('/uploads/photos/'));
    check('unsafe photo link refused', (await call('PUT', '/portal/content', A, { path: '/about/', items: [{ key: 'i:z~1', kind: 'image', value: 'javascript:alert(1)' }] })).status === 400);
    check('members cannot edit pages', (await call('PUT', '/portal/content', M1, { path: '/about/', items: [{ key: 'k', kind: 'text', value: 'x' }] })).status === 403);
    check('other pages are untouched', Object.keys((await call('GET', '/content?path=/speaking/')).body.data).length === 0);
    await call('PUT', '/portal/content', A, { path: '/about/', reset: true });
    check('reset puts the page back to original', Object.keys((await call('GET', '/content?path=/about/')).body.data).length === 0);

    // Community posts with photos and videos
    const cph = await upload('/portal/community/upload?kind=photos', M1, JPG, 'image/jpeg');
    check('members upload photos for posts', cph.status === 201 && cph.body.url.startsWith('/uploads/photos/'));
    check('upload needs sign-in', (await upload('/portal/community/upload?kind=photos', '', JPG, 'image/jpeg')).status === 401);
    const pPost = await call('POST', '/portal/community', M1, { body: 'My first workshop!', media: [{ type: 'photo', src: cph.body.url }] });
    check('post with a photo', pPost.status === 201);
    check('post with only a YouTube video (no text)', (await call('POST', '/portal/community', M1, { body: '', media: [{ type: 'video', src: 'https://youtu.be/dQw4w9WgXcQ' }] })).status === 201);
    check('photo from outside the site refused', (await call('POST', '/portal/community', M1, { body: 'x', media: [{ type: 'photo', src: 'https://evil.example/x.jpg' }] })).status === 400);
    check('more than one video refused', (await call('POST', '/portal/community', M1, { media: [{ type: 'video', src: 'https://youtu.be/dQw4w9WgXcQ' }, { type: 'video', src: 'https://vimeo.com/76979871' }] })).status === 400);
    check('empty post refused', (await call('POST', '/portal/community', M1, { body: '  ', media: [] })).status === 400);
    const feedT = (await call('GET', '/portal/community', T)).body.data;
    check('feed shows the photo and the playable video', feedT.some((p) => p.media.some((x) => x.type === 'photo' && x.src === cph.body.url)) && feedT.some((p) => p.media.some((x) => x.type === 'video' && x.video.kind === 'youtube')));
    await call('DELETE', `/portal/community/${pPost.body.id}`, M1);
    check('deleting a post removes its photo file', await new Promise((r) => setTimeout(() => r(!fs.existsSync(path.join(tmp, 'uploads', 'photos', path.basename(cph.body.url)))), 200)));

    // Books
    const bk = await call('POST', '/portal/media', A, { kind: 'book', title: 'Profit First', category: 'Mike Michalowicz', description: 'Cash system for small businesses.', src: 'https://bookshop.org/search?keywords=profit+first', show_on: ['books'] });
    check('admin adds a book', bk.status === 201);
    check('book without a title refused', (await call('POST', '/portal/media', A, { kind: 'book', title: '', show_on: ['books'] })).status === 400);
    check('unsafe book link refused', (await call('POST', '/portal/media', A, { kind: 'book', title: 'x', src: 'javascript:alert(1)' })).status === 400);
    check('members cannot add books', (await call('POST', '/portal/media', M1, { kind: 'book', title: 'x' })).status === 403);
    const shelf = (await call('GET', '/media?kind=book&on=books')).body.data;
    check('bookshelf lists the book with author and link', shelf.length === 1 && shelf[0].category === 'Mike Michalowicz' && shelf[0].link.startsWith('https://bookshop.org'));
    check('books never show up as videos on Watch', !(await call('GET', '/media?on=watch')).body.data.some((x) => x.kind === 'book'));
  } catch (e) {
    fail++; console.log('FAIL  test crashed: ' + e.stack);
  } finally {
    server.close(); db.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    fs.rmSync(tmp, { recursive: true, force: true });
    process.exit(fail ? 1 : 0);
  }
})();
