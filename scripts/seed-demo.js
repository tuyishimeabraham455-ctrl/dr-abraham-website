// ============================================================
//  Sample data so the web app looks and works like it's in use.
//    npm run seed-demo            add 10 sample accounts + activity
//    npm run seed-demo -- --remove   remove every sample item
//  Sample people have real-looking names and first.last@example.com
//  emails (example.com is reserved for examples, so no real person
//  gets mail). Everything added is listed in the demo_seed manifest,
//  so removal deletes exactly that and never touches real data.
//  Sample accounts sign in with the password: demo12345
// ============================================================
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const db = require('../database/db');
const m = require('../lib/members');
const { scoreLead } = require('../lib/leads');
const { allSlots } = require('../routes/booking');
const { UPLOAD_DIR, removeUpload } = require('../lib/uploads');

const DOMAIN = 'example.com';
const emailOf = (name) => `${name.replace(/^(Pastor|Dr\.?)\s+/, '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z ]/g, '').trim().split(/\s+/).join('.')}@${DOMAIN}`;
const PASSWORD = 'demo12345';
const like = `%@${DOMAIN}`;
const ago = (days, hours = 0) => new Date(Date.now() - (days * 24 + hours) * 3600000).toISOString().replace('T', ' ').slice(0, 19);
const ahead = (days) => new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
const manifest = () => { try { return JSON.parse(db.prepare(`SELECT value FROM site_settings WHERE key = 'demo_seed'`).get()?.value || '{}'); } catch { return {}; } };
const saveManifest = (v) => db.prepare(`INSERT INTO site_settings (key, value) VALUES ('demo_seed', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(JSON.stringify(v));

function remove() {
  const man = manifest();
  const demoIds = [...new Set([...(man.members || []), ...db.prepare(`SELECT id FROM members WHERE email LIKE ? AND role != 'admin'`).all(like).map((r) => r.id)])];
  const postIds = [...(man.posts || []), ...db.prepare(`SELECT id FROM community_posts WHERE member_id IN (${demoIds.map(() => '?').join(',') || 'NULL'})`).all(...demoIds).map((r) => r.id)];
  const files = postIds.flatMap((pid) => { try { return JSON.parse(db.prepare(`SELECT media FROM community_posts WHERE id = ?`).get(pid)?.media || '[]').map((x) => x.src); } catch { return []; } });
  db.transaction(() => {
    postIds.forEach((pid) => db.prepare(`DELETE FROM community_posts WHERE id = ?`).run(pid));
    demoIds.forEach((mid) => { db.prepare(`DELETE FROM community_comments WHERE member_id = ?`).run(mid); db.prepare(`DELETE FROM members WHERE id = ? AND role != 'admin'`).run(mid); }); // sessions, messages, assignments, posts follow
    (man.media || []).forEach((mid) => { const r = db.prepare(`SELECT src, thumb FROM media_items WHERE id = ?`).get(mid); if (r) files.push(r.src, r.thumb); db.prepare(`DELETE FROM media_items WHERE id = ?`).run(mid); });
    if (man.hero && db.prepare(`SELECT value FROM site_settings WHERE key = 'hero_video'`).get()?.value === man.hero) { db.prepare(`UPDATE site_settings SET value = '' WHERE key = 'hero_video'`).run(); files.push(man.hero); }
    (man.messages || []).forEach((id) => db.prepare(`DELETE FROM messages WHERE id = ?`).run(id));
    (man.comments || []).forEach((id) => db.prepare(`DELETE FROM community_comments WHERE id = ?`).run(id));
    (man.calls || []).forEach((x) => db.prepare(`DELETE FROM calls WHERE id = ?`).run(x));
    (man.leads || []).forEach((x) => db.prepare(`DELETE FROM inquiries WHERE id = ?`).run(x));
    (man.subscribers || []).forEach((x) => db.prepare(`DELETE FROM subscribers WHERE id = ?`).run(x));
    db.prepare(`DELETE FROM calls WHERE email LIKE ?`).run('%@demo.example.com');
    db.prepare(`DELETE FROM inquiries WHERE email LIKE ?`).run('%@demo.example.com');
    db.prepare(`DELETE FROM subscribers WHERE email LIKE ?`).run('%@demo.example.com');
    db.prepare(`DELETE FROM page_views WHERE referrer = 'demo-seed'`).run();
    (man.resources || []).forEach((id) => db.prepare(`DELETE FROM portal_resources WHERE id = ?`).run(id));
    (man.revenue || []).forEach((id) => db.prepare(`DELETE FROM revenue WHERE id = ?`).run(id));
    db.prepare(`DELETE FROM site_settings WHERE key = 'demo_seed'`).run();
  })();
  files.forEach(removeUpload);
  console.log('Sample data removed.');
}

function copyAsset(name, kind = 'photos') {
  const dir = path.join(UPLOAD_DIR, kind); fs.mkdirSync(dir, { recursive: true });
  const file = `${crypto.randomBytes(12).toString('hex')}${path.extname(name)}`;
  fs.copyFileSync(path.join(__dirname, 'demo-assets', name), path.join(dir, file));
  return `/uploads/${kind}/${file}`;
}
const copyPhoto = (name) => copyAsset(name, 'photos');
const copyVideo = (name) => copyAsset(path.join('videos', name), 'videos');

// Sample revenue across the last 12 months, so the monthly chart has something to show
function seedRevenue(man, adminId) {
  const month = (back, day) => { const d = new Date(); return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - back, Math.min(day, back ? 28 : d.getUTCDate()))).toISOString().slice(0, 10); };
  const ins = db.prepare(`INSERT INTO revenue (amount_cents, source, description, client, received_on, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
  man.revenue = [
    [11, 3, 2500, 'Speaking fee', 'Chamber luncheon keynote', 'Antioch Chamber of Commerce'], [10, 14, 1200, 'Coaching', '3-session coaching package', 'Private client'],
    [9, 8, 4000, 'Speaking fee', 'Conference breakout', 'Bay Area Women Expo'], [8, 20, 3600, 'Program', 'Business of You Lab, spring cohort (12 seats)', 'Lab members'],
    [7, 5, 1500, 'Sponsorship', 'Podcast season sponsor', 'Community Bank'], [6, 11, 5000, 'Speaking fee', 'Corporate training, 2 sessions', 'Becker Logistics'],
    [5, 2, 2400, 'Program', 'Funding-Ready Intensive, summer cohort', 'Intensive members'], [4, 17, 900, 'Product', 'Workbook bundle sales', 'Online store'],
    [3, 9, 7500, 'Speaking fee', 'Annual summit keynote', 'Women Who Build'], [2, 6, 1800, 'Coaching', 'Speaker coaching, 6 sessions', 'Private client'],
    [1, 13, 4800, 'Program', 'Speaker Academy, fall cohort', 'Academy members'], [1, 22, 2500, 'Speaking fee', 'Small business week panel', 'City of Antioch'],
    [0, 2, 3000, 'Speaking fee', 'Workshop, half day', 'East Bay SBDC'],
  ].map(([back, day, usd, source, desc, client]) => ins.run(usd * 100, source, `Sample: ${desc}`, client, month(back, day), adminId).lastInsertRowid);
}

function seed() {
  const existing = manifest();
  if (existing.members?.length && !existing.revenue) {
    const admin = db.prepare(`SELECT id FROM members WHERE role = 'admin' ORDER BY id LIMIT 1`).get();
    seedRevenue(existing, admin && admin.id); saveManifest(existing);
    console.log(`Added ${existing.revenue.length} sample revenue entries.`);
    return;
  }
  if (existing.members?.length) {
    console.log('Sample data is already there. To start over: npm run seed-demo -- --remove, then run it again.');
    return;
  }
  const admin = db.prepare(`SELECT * FROM members WHERE role = 'admin' AND status = 'active' ORDER BY id LIMIT 1`).get();
  if (!admin) { console.log('Create an admin first: npm run create-user -- --name "..." --email ... --role admin'); return; }
  const man = { members: [], posts: [], messages: [], comments: [], resources: [], leads: [], calls: [], subscribers: [], media: [] };
  const hash = m.hashPassword(PASSWORD);

  // ---- 10 accounts ----
  const people = [
    ['Keisha Morgan', 'team', 'Events & speaking calendar', 40],
    ['Daniel Reyes', 'team', 'Bookings & partnerships', 38],
    ['Amara Johnson', 'member', 'Speaker Academy', 30],
    ['Tanya Brooks', 'member', 'The Business of You Lab', 27],
    ['Marcus Lee', 'member', 'Funding-Ready Intensive', 24],
    ['Grace Mukamana', 'member', 'The Business of You Lab', 21],
    ['Rosa Delgado', 'member', 'Speaker Academy', 18],
    ['Jordan Ellis', 'member', 'The Business of You Lab', 14],
    ['Priya Shah', 'member', 'Funding-Ready Intensive', 10],
    ['Andre Thompson', 'member', 'Speaker Academy', 6],
  ];
  const ins = db.prepare(`INSERT INTO members (name, email, password, programs, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
  const id = {};
  db.transaction(() => people.forEach(([name, role, programs, days]) => {
    id[name.split(' ')[0]] = ins.run(name, emailOf(name), hash, programs, role, ago(days)).lastInsertRowid;
    man.members.push(id[name.split(' ')[0]]);
  }))();
  const Yo = admin.id;

  // ---- Community: posts with photos, a video, comments ----
  const post = (by, body, media, days, pinned = 0) => {
    const pid = db.prepare(`INSERT INTO community_posts (member_id, body, media, pinned, created_at) VALUES (?, ?, ?, ?, ?)`).run(by, body, media ? JSON.stringify(media) : '', pinned, ago(days)).lastInsertRowid;
    if (by === Yo) man.posts.push(pid);
    return pid;
  };
  const comment = (pid, by, body, days) => { const cid = db.prepare(`INSERT INTO community_comments (post_id, member_id, body, created_at) VALUES (?, ?, ?, ?)`).run(pid, by, body, ago(days)).lastInsertRowid; if (by === Yo) man.comments.push(cid); };
  const p1 = post(Yo, 'Welcome to the community! Introduce yourself below: your name, what you\'re building, and one thing you want help with this month. Share wins, questions and photos anytime.', null, 20, 1);
  comment(p1, id.Tanya, 'Hi all! Tanya, building a mobile bakery in Antioch. Want help pricing my catering packages.', 19);
  comment(p1, id.Marcus, 'Marcus here. Landscaping business, 3 years in. Working on getting funding-ready for a second truck.', 19);
  comment(p1, id.Grace, 'Grace, starting a tutoring service for immigrant families. So glad to be here.', 18);
  const p2 = post(id.Amara, 'Week 1 of the workbook done! Writing my problem statement out loud changed everything. My talk finally has a center.', [{ type: 'photo', src: copyPhoto('card-workbook.jpg') }], 9);
  comment(p2, Yo, 'This is it, Amara. When you can say the problem in one sentence, the room leans in. Proud of you.', 9);
  comment(p2, id.Rosa, 'Love this! Mine is still three sentences long 😅', 8);
  const p3 = post(id.Rosa, 'This talk is a masterclass in starting with why. Watch how he opens: no slides, just a story. Taking notes for my signature talk.', [{ type: 'video', src: 'https://www.youtube.com/watch?v=qp0HIF3SfI4' }], 7);
  comment(p3, id.Andre, 'Watched it twice. The golden circle maps perfectly onto step 1 of the framework.', 6);
  const p4 = post(id.Keisha, 'Who\'s coming to the Women in Business Summit in Oakland? Yo is speaking in the afternoon session. Comment below and we\'ll save you a seat near the front.', [{ type: 'photo', src: copyPhoto('card-summit.jpg') }], 5);
  comment(p4, id.Tanya, 'Count me in!', 5); comment(p4, id.Priya, 'Me too, bringing my business partner.', 4);
  const p5 = post(id.Marcus, 'Small win: opened my business credit file this week and set up my first two trade lines. Slow and steady.', [{ type: 'photo', src: copyPhoto('card-funding.jpg') }], 4);
  comment(p5, Yo, 'Slow and steady builds the file lenders want to see. Keep going, Marcus.', 3);
  const p6 = post(id.Tanya, 'My note to self this week.', [{ type: 'photo', src: copyPhoto('card-quote.jpg') }], 3);
  comment(p6, id.Grace, 'Needed this today. Thank you.', 2);
  const pv = post(id.Keisha, 'New lesson is up on the Watch page: three questions to test your idea before you build. Two minutes, worth it.', [{ type: 'video', src: copyVideo('lesson-real-problem.mp4') }], 2, 0);
  comment(pv, id.Jordan, 'Question three is the one I keep skipping. Not anymore.', 1);
  const p7 = post(id.Jordan, 'Question for the group: how did you price your first workshop? I\'m stuck between $49 and $149 for a 2-hour virtual session.', null, 2);
  comment(p7, id.Daniel, 'Start with the outcome, not the hours. What is it worth to them to have that solved? Bring it to Thursday\'s office hours.', 1);
  comment(p7, id.Amara, 'I started at $97 with a workbook included. Sold out twice.', 1);
  post(id.Priya, 'Two pages of my funding plan done. Sharing my workbook spread and the checklist that kept me on track.', [{ type: 'photo', src: copyPhoto('card-workbook.jpg') }, { type: 'photo', src: copyPhoto('card-funding.jpg') }], 1);

  // ---- Messages (some unread for the admin) ----
  const msg = (from, to, subject, body, days, read = true, thread = null) => {
    const mid = db.prepare(`INSERT INTO messages (thread_id, from_id, to_id, subject, body, read_at, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(thread, from, to, subject, body, read ? ago(days, -1) : null, ago(days)).lastInsertRowid;
    if (from === Yo || to === Yo) man.messages.push(mid);
    return mid;
  };
  const t1 = msg(id.Amara, Yo, 'Feedback on my opening story', 'Hi Yo, I recorded my 2-minute opening. Could you take a look before Thursday? Link is in my assignment.', 3);
  msg(Yo, id.Amara, 'Re: Feedback on my opening story', 'Watched it. Your voice is strong. Start one beat later, right at the moment the preschool doors closed. More notes on the assignment.', 2, true, t1);
  msg(id.Marcus, Yo, 'Question about the Funding-Ready Intensive', 'Is the next cohort in January? I want my partner to join.', 1, false);
  msg(id.Keisha, Yo, 'Summit run of show', 'Run of show for Oakland is confirmed: you\'re on at 2:15pm for 45 minutes, Q&A after. Green room from 1:30.', 1, false);
  msg(id.Daniel, Yo, 'New corporate lead looks strong', 'Bay Credit Union asked for a keynote + workshop in March. Budget is in range. I booked a discovery call for this week.', 0, false);
  msg(id.Grace, id.Keisha, 'Office hours time', 'Hi Keisha, are Thursday office hours at 6pm Pacific?', 2);

  // ---- Assignments at every stage ----
  const asg = db.prepare(`INSERT INTO assignments (title, details, assigned_by, assigned_to, due_date, status, submission, feedback, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  asg.run('Record your 2-minute signature story', 'Phone video is fine. Open with the moment everything changed. Submit the link here.', Yo, id.Amara, ahead(2), 'submitted', 'Here it is: https://example.com/amara-story (unlisted). I tried opening at the moment the doors closed.', '', ago(8), ago(1));
  asg.run('Write your problem statement', 'One sentence: who has the problem, how painful it is, and what it costs them.', Yo, id.Tanya, ahead(-2), 'in_progress', '', '', ago(10), ago(3));
  asg.run('Pull your personal and business credit reports', 'Use the funding checklist. Note anything you don\'t recognise.', Yo, id.Marcus, ahead(5), 'done', 'Both reports pulled. One old address to fix, otherwise clean.', 'Great work. Fix the address this week and you\'re ready for step 3.', ago(12), ago(4));
  asg.run('Draft your speaker bio (100 words)', 'Third person, one result you\'re proud of, one line about who you serve.', id.Daniel, id.Rosa, ahead(4), 'needs_changes', 'Rosa Delgado is a speaker and coach who helps women…', 'Strong start. Add one specific result with a number, and cut the second sentence.', ago(6), ago(1));
  asg.run('Price your first workshop', 'Bring three price points and what each one includes to office hours.', Yo, id.Jordan, ahead(6), 'todo', '', '', ago(2), ago(2));
  asg.run('Book your first discovery call with a planner', 'Use the planner list from the Speaker Academy resources.', id.Keisha, id.Andre, ahead(9), 'todo', '', '', ago(1), ago(1));
  asg.run('Update the Oakland run of show', 'Add Yo\'s green room time and the Q&A mic plan.', Yo, id.Keisha, ahead(3), 'in_progress', '', '', ago(2), ago(1));

  // ---- Speaker bookings (leads with scores) + discovery calls ----
  const leads = [
    ['Monique Harris', 'Bay Credit Union', 'Booking (book form)', 'Corporate keynote', ahead(120), '$10,000+', '200 to 500', 'Yes', 'book-form', 'new', 0, 'Keynote plus workshop for our member business week. Looking at Credit, Capital & Confidence.'],
    ['Pastor James Wright', 'New Hope Fellowship', 'Booking (book form)', 'Church or ministry event', ahead(75), '$2,500 to $5,000', '200 to 500', 'Yes', 'book-form', 'read', 1, 'Women\'s conference, Saturday morning keynote. Each One, Reach One feels right.'],
    ['Sofia Ramirez', 'Latina Founders Network', 'Booking (Agent Yo)', 'Conference', ahead(160), '$5,000 to $10,000', '500+', 'Yes', 'agent', 'new', 2, 'Annual founders summit, closing keynote. Agent Yo suggested The Business of You.'],
    ['Kevin Park', 'East Bay SBDC', 'Booking (book form)', 'Workshop', ahead(45), '$2,500 to $5,000', '50 to 200', 'Not sure', 'book-form', 'replied', 4, 'Half-day business credit workshop for small business owners.'],
    ['Lena Ortiz', 'City of Antioch', 'Booking (homepage)', 'Nonprofit / community event', ahead(30), 'Under $2,500', '50 to 200', 'No', 'homepage', 'new', 3, 'Small business week panel. Budget is limited but flexible.'],
    ['Rachel Kim', 'Money Moves Podcast', 'Press / podcast', '', '', '', '', '', 'contact', 'new', 1, 'Would love to interview Yo about social capital for our spring season.'],
    ['Tom Becker', 'Becker Logistics', 'Booking (book form)', 'Corporate training', ahead(200), '$5,000 to $10,000', '50 to 200', 'Yes', 'book-form', 'read', 6, 'Leadership offsite, 2 sessions on financial wellness for managers.'],
    ['Aisha Bello', 'Women Who Build', 'Booking (Agent Yo)', 'Virtual event', ahead(25), '$2,500 to $5,000', '200 to 500', 'Yes', 'agent', 'closed', 9, 'Virtual masterclass. Date moved, will rebook next quarter.'],
  ];
  const insL = db.prepare(`INSERT INTO inquiries (name, email, organization, inquiry_type, event_type, event_date, budget, message, status, score, source, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  const leadIds = leads.map(([name, org, type, event, date, budget, audience, dm, source, status, days, message]) => {
    const score = event ? scoreLead({ event_date: date, budget, audience, decision_maker: dm, organization: org }) : 10;
    return insL.run(name, emailOf(name), org, type, event, date, budget, message, status, score, source, JSON.stringify({ audience, decision_maker: dm, demo: true }), ago(days, 3)).lastInsertRowid;
  });
  man.leads.push(...leadIds);
  const taken = new Set(db.prepare(`SELECT starts_at FROM calls`).all().map((r) => r.starts_at));
  const free = allSlots().filter((s) => !taken.has(s));
  [[0, 0], [2, 2], [3, 6], [6, 9]].forEach(([li, si]) => {
    if (!free[si]) return;
    man.calls.push(db.prepare(`INSERT INTO calls (name, email, inquiry_id, starts_at) VALUES (?, ?, ?, ?)`).run(leads[li][0], emailOf(leads[li][0]), leadIds[li], free[si]).lastInsertRowid);
  });

  // ---- Newsletter subscribers + a week of visits ----
  const sources = ['homepage', 'footer', 'workbook', 'blog', 'agent', 'podcast'];
  const insS = db.prepare(`INSERT INTO subscribers (email, first_name, source, created_at) VALUES (?, ?, ?, ?)`);
  ['Nia Carter', 'Carlos Mendoza', 'Imani Wallace', 'Wei Chen', 'Fatima Okafor', 'Luis Romero', 'Hannah Goldberg', 'Kwame Asante', 'Elena Petrova', 'Brandon Hayes', 'Mei Tanaka', 'Omar Haddad', 'Zara Ahmed', 'Dev Patel'].forEach((n, i) => man.subscribers.push(insS.run(emailOf(n), n.split(' ')[0], sources[i % sources.length], ago(i * 2 + 1)).lastInsertRowid));
  const pages = ['/', '/', '/', '/about/', '/speaking/', '/book/', '/watch/', '/podcast/', '/learn/', '/blog/is-your-business-idea-a-real-problem/', '/speaking/credit-capital-confidence/'];
  const insV = db.prepare(`INSERT INTO page_views (page, referrer, user_agent, ip_hash, created_at) VALUES (?, 'demo-seed', 'demo', ?, ?)`);
  db.transaction(() => { for (let i = 0; i < 140; i++) insV.run(pages[i % pages.length], crypto.randomBytes(4).toString('hex'), ago(Math.floor(i / 20), i % 24)); })();

  // ---- Resources for members ----
  const insR = db.prepare(`INSERT INTO portal_resources (title, description, url, kind, audience, created_by) VALUES (?, ?, ?, ?, ?, ?)`);
  man.resources.push(insR.run('Problem statement workbook', 'Week 1 of the Lab: who has the problem and what it costs them.', '/learn/workbook/', 'Workbook', 'member', Yo).lastInsertRowid);
  man.resources.push(insR.run('Funding-ready checklist', 'The 30-day checklist for business credit and lender files.', '/learn/funding-checklist/', 'Template', 'member', Yo).lastInsertRowid);
  man.resources.push(insR.run('Speaker booking checklist', 'What planners need from you, before and after the event.', '/learn/event-planner-checklist/', 'Template', 'all', Yo).lastInsertRowid);

  // ---- Yo's bookshelf: sample recommendations (real books by other authors) ----
  const insB = db.prepare(`INSERT INTO media_items (kind, title, description, category, src, thumb, show_on, featured, sort) VALUES ('book', ?, ?, ?, ?, ?, 'books', 0, ?)`);
  [
    ['Everything Is Figureoutable', 'Marie Forleo', 'real-figureoutable.jpg', 'For the days you doubt you can build it. A practical push to stop waiting and start.'],
    ['Profit First', 'Mike Michalowicz', 'real-profit-first.jpg', 'A simple cash system for small businesses: pay yourself and your taxes before anything else.'],
    ['The Psychology of Money', 'Morgan Housel', 'real-psychology-money.jpg', 'Why money decisions are about behavior, not math. Great for founders rethinking their relationship with money.'],
    ['Start with Why', 'Simon Sinek', 'real-start-with-why.jpg', 'Every speaker should know their why before their how. The thinking behind step 1 of the framework.'],
    ['Dare to Lead', 'Brené Brown', 'real-dare-to-lead.jpg', 'Leadership that makes room for courage and honest conversations, for teams of two or two hundred.'],
    ['Atomic Habits', 'James Clear', 'real-atomic-habits.jpg', 'Small daily systems that compound. Pairs well with the Sustain yourself step.'],
  ].forEach(([title, author, cover, why], i) => {
    man.media.push(insB.run(title, `Sample pick: ${why}`, author, `https://bookshop.org/search?keywords=${encodeURIComponent(title + ' ' + author)}`, copyPhoto(cover), i).lastInsertRowid);
  });

  // ---- Watch page: lesson videos (motion graphics made from Yo's own articles) ----
  const insV2 = db.prepare(`INSERT INTO media_items (kind, title, description, category, src, thumb, show_on, featured, sort) VALUES ('video', ?, ?, 'Lessons', ?, ?, ?, ?, ?)`);
  [
    ['Is your idea a real problem?', 'Three questions to answer before you build: who has the problem, how much it hurts, and whether they will pay to fix it.', 'lesson-real-problem.mp4', 'thumb-lesson-real-problem.jpg', 'watch,about', 1],
    ['Business credit, before you apply', 'Make it official and build a record of on-time payments, three to six months before you ask a lender. Education, not financial advice.', 'lesson-business-credit.mp4', 'thumb-lesson-business-credit.jpg', 'watch', 0],
    ['Social capital is real capital', 'Each one, reach one: the relationships every business needs, and how to build them by giving first.', 'lesson-social-capital.mp4', 'thumb-lesson-social-capital.jpg', 'watch', 0],
  ].forEach(([title, desc, file, thumb, on, featured], i) => {
    if (featured) db.prepare(`UPDATE media_items SET featured = 0 WHERE kind = 'video'`).run();
    man.media.push(insV2.run(title, desc, copyVideo(file), copyPhoto(thumb), on, featured, i).lastInsertRowid);
  });

  // ---- Homepage background video, only if none is set yet ----
  const heroNow = db.prepare(`SELECT value FROM site_settings WHERE key = 'hero_video'`).get()?.value;
  if (!heroNow) {
    man.hero = copyVideo('hero-ambient.mp4');
    db.prepare(`INSERT INTO site_settings (key, value) VALUES ('hero_video', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).run(man.hero);
  }

  seedRevenue(man, Yo);
  saveManifest(man);
  console.log(`Added sample data:
  10 accounts (2 team, 8 members) — sign in with any of them using password ${PASSWORD}
     e.g. amara.johnson@${DOMAIN}, keisha.morgan@${DOMAIN}
  ${man.posts.length + 8} community posts with photos, a video and comments
  messages, 7 assignments at every stage, 8 booking requests, discovery calls,
  14 subscribers, a week of page visits, 3 member resources, 6 books on the bookshelf,
  3 lesson videos on the Watch page, a homepage background video (if none was set)
  and 13 sample revenue entries across the last 12 months
Remove it all any time: npm run seed-demo -- --remove`);
}

process.argv.includes('--remove') ? remove() : seed();
