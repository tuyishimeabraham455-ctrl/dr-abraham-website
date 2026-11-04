/* ============================================================
   Portal app — multi-user dashboard
   Everything shown on screen is escaped with h().
============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const KEY = 'yoPortalToken';
  const store = { get: () => { try { return localStorage.getItem(KEY); } catch { return null; } }, set: (v) => { try { v ? localStorage.setItem(KEY, v) : localStorage.removeItem(KEY); } catch { /* storage blocked */ } } };
  const h = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const when = (d) => { if (!d) return ''; const t = new Date(/Z|[+-]\d\d:\d\d$/.test(d) ? d : d.replace(' ', 'T') + 'Z'); return t.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); };
  const ROLE = { admin: 'Admin', team: 'Team', member: 'Member' };
  let me = null;

  async function api(path, opts = {}) {
    const res = await fetch('/api' + path, { ...opts, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + (store.get() || ''), ...(opts.headers || {}) }, body: opts.body ? JSON.stringify(opts.body) : undefined });
    if (res.status === 401) { signOut(); throw new Error('Please sign in again.'); }
    const out = await res.json().catch(() => ({ ok: false, message: 'Unexpected response.' }));
    if (!res.ok && !out.message) out.message = 'Something went wrong.';
    return out;
  }

  /* ---------- Sign in / out ---------- */
  const loginBox = $('#pLogin'), app = $('#pApp');
  $('#pLoginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#pLoginMsg'); msg.textContent = 'Signing in…'; msg.className = 'form-msg';
    try {
      const res = await fetch('/api/members/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(e.target))) });
      const out = await res.json();
      if (!out.ok) { msg.textContent = out.message; msg.className = 'form-msg err'; return; }
      store.set(out.token); e.target.reset(); boot();
    } catch { msg.textContent = 'The portal runs on the live server. It is not available on this preview.'; msg.className = 'form-msg err'; }
  });
  function signOut() { const t = store.get(); if (t) fetch('/api/members/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(() => {}); store.set(null); me = null; app.hidden = true; loginBox.hidden = false; history.replaceState(null, '', location.pathname); }
  $('#pLogout').addEventListener('click', signOut);

  /* ---------- Shell ---------- */
  const TABS = [
    ['overview', 'Overview', 'staff'], ['leads', 'Leads', 'staff'], ['calls', 'Calls', 'staff'], ['agent', 'Agent Yo', 'staff'],
    ['subscribers', 'Subscribers', 'staff'], ['outbox', 'Email outbox', 'staff'], ['home', 'Home', 'member'],
    ['inbox', 'Inbox', 'all'], ['community', 'Community', 'all'], ['resources', 'Resources', 'all'], ['people', 'People', 'admin'], ['account', 'Account', 'all'],
  ];
  const isStaff = () => me && (me.role === 'admin' || me.role === 'team');
  const allowed = (who) => who === 'all' || (who === 'staff' && isStaff()) || (who === 'member' && !isStaff()) || (who === 'admin' && me.role === 'admin');

  async function boot() {
    if (!store.get()) { loginBox.hidden = false; app.hidden = true; return; }
    try {
      const out = await api('/portal/me');
      if (!out.ok) throw new Error(out.message);
      me = out.member;
      $('#pName').textContent = me.name; $('#pRole').textContent = ROLE[me.role] || me.role;
      $('#pAva').textContent = me.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
      $('#pNav').innerHTML = TABS.filter(([, , who]) => allowed(who)).map(([k, label]) => `<a href="#${k}" data-tab="${k}">${h(label)}${k === 'inbox' ? `<span class="p-badge" id="pUnread"${out.unread ? '' : ' hidden'}>${out.unread}</span>` : ''}</a>`).join('');
      loginBox.hidden = true; app.hidden = false;
      route();
    } catch { if (!store.get()) return; loginBox.hidden = false; app.hidden = true; }
  }
  addEventListener('hashchange', route);
  function route() {
    if (!me) return;
    const first = isStaff() ? 'overview' : 'home';
    let tab = location.hash.slice(1).split('/')[0] || first;
    const def = TABS.find(([k]) => k === tab);
    if (!def || !allowed(def[2])) tab = first;
    document.querySelectorAll('#pNav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab));
    $('#pTitle').textContent = TABS.find(([k]) => k === tab)[1]; $('#pActions').innerHTML = '';
    const view = $('#pView'); view.innerHTML = '<p class="p-loading">Loading…</p>';
    (VIEWS[tab] || VIEWS.home)(view, location.hash.split('/')[1]).catch((err) => { view.innerHTML = `<p class="form-msg err">${h(err.message)}</p>`; });
  }
  const refreshUnread = async () => { const out = await api('/portal/me'); const b = $('#pUnread'); if (b) { b.textContent = out.unread; b.hidden = !out.unread; } };

  /* ---------- Small UI helpers ---------- */
  const kpi = (label, value, note = '') => `<div class="p-kpi"><span>${h(label)}</span><b>${h(value)}</b>${note ? `<small>${h(note)}</small>` : ''}</div>`;
  const table = (cols, rows, empty = 'Nothing here yet.') => rows.length ? `<div class="p-table-wrap"><table class="p-table"><thead><tr>${cols.map(([l]) => `<th>${h(l)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([, f]) => `<td>${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="p-empty">${h(empty)}</p>`;
  const scoreTag = (s) => `<span class="p-score ${s >= 60 ? 'hot' : s >= 30 ? 'warm' : ''}">${h(s || 0)}</span>`;
  const statusSelect = (kind, idv, current, options) => `<select class="p-status" data-kind="${kind}" data-id="${idv}">${options.map((o) => `<option${o === current ? ' selected' : ''}>${o}</option>`).join('')}</select>`;
  const flash = (el, text, ok = true) => { el.textContent = text; el.className = 'form-msg ' + (ok ? 'ok' : 'err'); };
  document.addEventListener('change', async (e) => {
    const s = e.target.closest('.p-status'); if (!s) return;
    const out = await api(`/portal/${s.dataset.kind}/${s.dataset.id}`, { method: 'PATCH', body: { status: s.value } });
    s.classList.toggle('saved', !!out.ok); setTimeout(() => s.classList.remove('saved'), 1200);
  });

  /* ---------- Views ---------- */
  const VIEWS = {
    async overview(v) {
      const o = await api('/portal/overview'); const k = o.kpis;
      v.innerHTML = `<div class="p-kpis">${kpi('New inquiries', k.new_inquiries)}${kpi('Hot leads', k.hot_leads, 'score 60+')}${kpi('Upcoming calls', k.upcoming_calls)}${kpi('Subscribers', k.subscribers)}${kpi('Agent Yo conversion', o.agent.conversion_rate + '%', o.agent.sessions + ' chats')}${kpi('Emails waiting', k.queued_emails, 'outbox')}</div>
        <div class="p-grid2">
          <section class="p-card"><h2>Recent leads</h2>${table([['Name', (r) => `<b>${h(r.name)}</b><small>${h(r.organization || r.email)}</small>`], ['Type', (r) => h(r.inquiry_type || '')], ['Score', (r) => scoreTag(r.score)], ['Status', (r) => statusSelect('leads', r.id, r.status, ['new', 'read', 'replied', 'closed'])]], o.recent_leads, 'No leads yet.')}<a class="link-arrow" href="#leads">All leads</a></section>
          <section class="p-card"><h2>Upcoming calls</h2>${table([['When', (r) => h(when(r.starts_at))], ['Who', (r) => `<b>${h(r.name)}</b><small>${h(r.email)}</small>`]], o.upcoming_calls, 'No calls booked.')}<h2 style="margin-top:1.6rem">Sign-ups by source</h2>${table([['Source', (r) => h(r.source)], ['Count', (r) => h(r.n)]], o.subscribers_by_source, 'No sign-ups yet.')}</section>
        </div>`;
    },
    async leads(v) {
      v.innerHTML = `<div class="p-tools"><input type="search" id="lq" placeholder="Search name, email, organization or message"/><select id="ls"><option value="">All statuses</option><option>new</option><option>read</option><option>replied</option><option>closed</option></select></div><div id="lt"></div>`;
      const load = async () => {
        const out = await api(`/portal/leads?q=${encodeURIComponent($('#lq').value)}&status=${encodeURIComponent($('#ls').value)}`);
        $('#lt').innerHTML = table([
          ['Received', (r) => h(when(r.created_at))], ['Name', (r) => `<b>${h(r.name)}</b><small><a href="mailto:${h(r.email)}">${h(r.email)}</a></small>`],
          ['Request', (r) => `${h(r.inquiry_type || '')}<small>${h([r.event_type, r.event_date, r.budget].filter(Boolean).join(' · '))}</small><details><summary>Details</summary><p class="p-pre">${h(r.message)}</p></details>`],
          ['Source', (r) => h(r.source || '')], ['Score', (r) => scoreTag(r.score)], ['Status', (r) => statusSelect('leads', r.id, r.status, ['new', 'read', 'replied', 'closed'])],
        ], out.data, 'No leads match.');
      };
      let t; $('#lq').addEventListener('input', () => { clearTimeout(t); t = setTimeout(load, 250); }); $('#ls').addEventListener('change', load); await load();
    },
    async calls(v) {
      const out = await api('/portal/calls');
      v.innerHTML = table([['When', (r) => h(when(r.starts_at))], ['Who', (r) => `<b>${h(r.name)}</b><small><a href="mailto:${h(r.email)}">${h(r.email)}</a></small>`], ['Lead', (r) => (r.inquiry_id ? `#${h(r.inquiry_id)}` : '')], ['Status', (r) => statusSelect('calls', r.id, r.status, ['booked', 'done', 'cancelled'])]], out.data, 'No calls booked yet.');
    },
    async agent(v) {
      const out = await api('/portal/agent'); const a = out.analytics;
      v.innerHTML = `<div class="p-kpis">${kpi('Conversations', a.sessions)}${kpi('Leads captured', a.leads)}${kpi('Conversion', a.conversion_rate + '%')}${kpi('Drop-off', a.dropoff_rate + '%', 'left after 1 message')}${kpi('Crisis redirects', a.crisis_redirects)}</div>
        <div class="p-grid2">
          <section class="p-card"><h2>Top questions</h2>${table([['Question', (r) => h(r.question)], ['Times', (r) => h(r.n)]], a.top_questions)}<h2 style="margin-top:1.6rem">Pages that start chats</h2>${table([['Page', (r) => h(r.page)], ['Chats', (r) => h(r.n)]], a.pages)}</section>
          <section class="p-card"><h2>Content gaps</h2><p class="fine">Questions Agent Yo couldn't answer: ideas for episodes, posts and FAQs.</p>${table([['Question', (r) => h(r.question)], ['Topic', (r) => h(r.topic)]], a.content_gaps, 'No gaps logged yet.')}</section>
        </div>
        <section class="p-card"><h2>Recent conversations</h2>${out.sessions.length ? out.sessions.map((s) => `<details class="p-convo"><summary><b>${h(when(s.updated_at))}</b> · ${h(s.mode || 'unknown')} · ${h(s.turns)} turns${s.lead_id ? ' · lead #' + h(s.lead_id) : ''}${s.locked ? ' · crisis redirect' : ''}</summary>${s.transcript.map((t) => `<p class="p-line ${t.role}"><span>${t.role === 'user' ? 'Visitor' : 'Agent Yo'}</span>${h(t.text)}</p>`).join('')}</details>`).join('') : '<p class="p-empty">No conversations yet.</p>'}</section>`;
    },
    async subscribers(v) {
      const out = await api('/portal/subscribers');
      $('#pActions').innerHTML = '<button type="button" class="btn btn-dark btn-sm" id="csv">Download CSV</button>';
      $('#csv').addEventListener('click', async () => {
        const res = await fetch('/api/portal/subscribers?format=csv', { headers: { Authorization: 'Bearer ' + store.get() } });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(await res.blob()), download: 'subscribers.csv' }); document.body.appendChild(a); a.click(); a.remove();
      });
      v.innerHTML = table([['Email', (r) => h(r.email)], ['Source', (r) => h(r.source)], ['Status', (r) => h(r.status)], ['Joined', (r) => h(when(r.created_at))]], out.data, 'No subscribers yet.');
    },
    async outbox(v) {
      const out = await api('/portal/outbox');
      v.innerHTML = `<p class="fine">Emails are sent automatically once an email service key is added on the server. Until then they wait here.</p>` + table([['Created', (r) => h(when(r.created_at))], ['To', (r) => h(r.to_email)], ['Subject', (r) => `${h(r.subject)}<small>${h(r.kind)}</small>`], ['Status', (r) => `<span class="p-pill ${h(r.status)}">${h(r.status)}</span>${r.error ? `<small>${h(r.error)}</small>` : ''}`]], out.data, 'No emails yet.');
    },
    async home(v) {
      const [res, msgs] = await Promise.all([api('/portal/resources'), api('/portal/messages')]);
      v.innerHTML = `<section class="p-card p-welcome"><h2>Welcome, ${h(me.name.split(' ')[0])}.</h2><p>Your programs: <b>${h(me.programs || 'none yet')}</b></p><div class="hero-ctas"><a class="btn btn-dark btn-sm" href="#inbox/new">Message the team</a><a class="btn btn-ghost-dark btn-sm" href="#community">Visit the community</a></div></section>
        <div class="p-grid2"><section class="p-card"><h2>Latest resources</h2>${res.data.slice(0, 5).map((r) => `<a class="p-res" href="${h(r.url)}" target="_blank" rel="noopener"><b>${h(r.title)}</b><small>${h(r.kind)}</small></a>`).join('') || '<p class="p-empty">Resources appear here.</p>'}</section>
        <section class="p-card"><h2>Recent messages</h2>${msgs.data.slice(0, 5).map((m) => `<a class="p-res" href="#inbox/${m.id}"><b>${h(m.subject)}</b><small>${h(m.from_name)} · ${h(when(m.created_at))}</small></a>`).join('') || '<p class="p-empty">No messages yet.</p>'}</section></div>`;
    },
    async inbox(v, sub) {
      if (sub === 'new') return compose(v);
      if (sub && /^\d+$/.test(sub)) return openThread(v, sub);
      const box = (location.hash.includes('sent') ? 'sent' : 'inbox');
      $('#pActions').innerHTML = `<a class="btn btn-dark btn-sm" href="#inbox/new">New message</a>`;
      const out = await api(`/portal/messages?box=${box}`);
      v.innerHTML = `<div class="seg" role="tablist"><a role="tab" href="#inbox" aria-selected="${box === 'inbox'}">Inbox</a><a role="tab" href="#inbox/sent" aria-selected="${box === 'sent'}">Sent</a></div>
        <div class="p-list">${out.data.map((m) => `<a class="p-msg${!m.read_at && box === 'inbox' ? ' unread' : ''}" href="#inbox/${m.id}"><b>${h(box === 'sent' ? 'To ' + m.to_name : m.from_name)}</b><span>${h(m.subject)}</span><small>${h(m.preview)}</small><time>${h(when(m.created_at))}</time></a>`).join('') || '<p class="p-empty">No messages yet.</p>'}</div>`;
    },
    async community(v) {
      const out = await api('/portal/community');
      v.innerHTML = `<form class="p-card p-post-form" id="cp"><label class="sr" for="cpBody">Share with the community</label><textarea id="cpBody" name="body" rows="3" required maxlength="4000" placeholder="Share a win, a question or a resource…"></textarea><div class="p-row"><button class="btn btn-dark btn-sm">Post</button><span class="form-msg" aria-live="polite"></span></div></form>
        <div id="feed">${out.data.map((p) => `<article class="p-card p-post${p.pinned ? ' pinned' : ''}"><header><b>${h(p.author)}</b><span class="p-role-sm">${h(ROLE[p.author_role] || '')}</span><time>${h(when(p.created_at))}</time>${p.pinned ? '<span class="p-pill">Pinned</span>' : ''}</header><p class="p-pre">${h(p.body)}</p>
          <div class="p-post-actions">${isStaff() ? `<button type="button" class="linkish" data-pin="${p.id}">${p.pinned ? 'Unpin' : 'Pin'}</button>` : ''}${p.mine || isStaff() ? `<button type="button" class="linkish" data-del="${p.id}">Delete</button>` : ''}</div>
          <div class="p-comments">${p.comments.map((c) => `<p><b>${h(c.author)}</b> ${h(c.body)}</p>`).join('')}<form data-comment="${p.id}"><label class="sr" for="cm${p.id}">Comment</label><input id="cm${p.id}" name="body" placeholder="Write a comment…" maxlength="2000" required/><button class="btn btn-ghost-dark btn-sm">Reply</button></form></div></article>`).join('') || '<p class="p-empty">Be the first to post.</p>'}</div>`;
      $('#cp').addEventListener('submit', async (e) => { e.preventDefault(); const out2 = await api('/portal/community', { method: 'POST', body: { body: e.target.body.value } }); if (out2.ok) route(); else flash($('#cp .form-msg'), out2.message, false); });
      v.querySelectorAll('[data-comment]').forEach((f) => f.addEventListener('submit', async (e) => { e.preventDefault(); await api(`/portal/community/${f.dataset.comment}/comments`, { method: 'POST', body: { body: f.body.value } }); route(); }));
      v.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Delete this post?')) { await api(`/portal/community/${b.dataset.del}`, { method: 'DELETE' }); route(); } }));
      v.querySelectorAll('[data-pin]').forEach((b) => b.addEventListener('click', async () => { await api(`/portal/community/${b.dataset.pin}/pin`, { method: 'POST' }); route(); }));
    },
    async resources(v) {
      const out = await api('/portal/resources');
      v.innerHTML = (isStaff() ? `<form class="p-card p-res-form" id="rf"><h2>Add a resource</h2><div class="row2"><div class="field"><label for="rt">Title</label><input id="rt" name="title" required maxlength="160"/></div><div class="field"><label for="ru">Link</label><input id="ru" name="url" required placeholder="https:// or /learn/…"/></div></div><div class="row2"><div class="field"><label for="rk">Type</label><select id="rk" name="kind"><option>Workbook</option><option>Template</option><option>Recording</option><option selected>Link</option></select></div><div class="field"><label for="ra">Who can see it</label><select id="ra" name="audience"><option value="all">Everyone</option><option value="member">Members</option><option value="team">Team only</option></select></div></div><div class="field"><label for="rd">Description</label><input id="rd" name="description" maxlength="600"/></div><div class="p-row"><button class="btn btn-dark btn-sm">Add resource</button><span class="form-msg" aria-live="polite"></span></div></form>` : '') +
        `<div class="p-res-grid">${out.data.map((r) => `<div class="p-card p-res-card"><span class="p-pill">${h(r.kind)}</span><b>${h(r.title)}</b><p>${h(r.description)}</p><a class="link-arrow" href="${h(r.url)}" target="_blank" rel="noopener">Open</a>${isStaff() ? `<button type="button" class="linkish" data-rdel="${r.id}">Remove</button>` : ''}</div>`).join('') || '<p class="p-empty">No resources yet.</p>'}</div>`;
      if (isStaff()) {
        $('#rf').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/resources', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); if (o.ok) route(); else flash($('#rf .form-msg'), o.message, false); });
        v.querySelectorAll('[data-rdel]').forEach((b) => b.addEventListener('click', async () => { if (confirm('Remove this resource?')) { await api(`/portal/resources/${b.dataset.rdel}`, { method: 'DELETE' }); route(); } }));
      }
    },
    async people(v) {
      const out = await api('/portal/users');
      v.innerHTML = `<div class="p-grid2"><form class="p-card" id="uf"><h2>Create an account</h2><div class="field"><label for="un">Name</label><input id="un" name="name" required/></div><div class="field"><label for="ue">Email</label><input id="ue" name="email" type="email" required/></div><div class="row2"><div class="field"><label for="ur">Role</label><select id="ur" name="role"><option value="member">Member</option><option value="team">Team</option><option value="admin">Admin</option></select></div><div class="field"><label for="up">Programs</label><input id="up" name="programs" placeholder="e.g. Speaker Academy"/></div></div><div class="p-row"><button class="btn btn-dark btn-sm">Create account</button></div><p class="form-msg" aria-live="polite"></p></form>
        <form class="p-card" id="bf"><h2>Message everyone</h2><div class="field"><label for="bs">Subject</label><input id="bs" name="subject" required maxlength="160"/></div><div class="field"><label for="bb">Message</label><textarea id="bb" name="body" rows="4" required></textarea></div><div class="p-row"><button class="btn btn-dark btn-sm">Send to all</button><span class="form-msg" aria-live="polite"></span></div></form></div>
        <section class="p-card">${table([['Name', (r) => `<b>${h(r.name)}</b><small>${h(r.email)}</small>`], ['Role', (r) => `<select class="p-urole" data-id="${r.id}" data-field="role">${['member', 'team', 'admin'].map((x) => `<option value="${x}"${x === r.role ? ' selected' : ''}>${ROLE[x]}</option>`).join('')}</select>`], ['Status', (r) => `<select class="p-urole" data-id="${r.id}" data-field="status">${['active', 'paused'].map((x) => `<option${x === r.status ? ' selected' : ''}>${x}</option>`).join('')}</select>`], ['Programs', (r) => h(r.programs || '')], ['', (r) => `<button type="button" class="linkish" data-reset="${r.id}">Reset password</button>`]], out.data)}<p class="form-msg" id="um" aria-live="polite"></p></section>`;
      const um = $('#um');
      $('#uf').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/users', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); const msg = $('#uf .form-msg'); if (o.ok) { msg.innerHTML = `Created. Temporary password: <code>${h(o.temp_password)}</code><br/>Share it privately; it won't be shown again.`; msg.className = 'form-msg ok'; e.target.reset(); } else flash(msg, o.message, false); });
      $('#bf').addEventListener('submit', async (e) => { e.preventDefault(); if (!confirm('Send this message to every account?')) return; const o = await api('/portal/broadcast', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); flash($('#bf .form-msg'), o.message, o.ok); if (o.ok) e.target.reset(); });
      v.querySelectorAll('.p-urole').forEach((s) => s.addEventListener('change', async () => { const o = await api(`/portal/users/${s.dataset.id}`, { method: 'PATCH', body: { [s.dataset.field]: s.value } }); flash(um, o.ok ? 'Saved.' : o.message, o.ok); if (!o.ok) route(); }));
      v.querySelectorAll('[data-reset]').forEach((b) => b.addEventListener('click', async () => { if (!confirm('Reset this password? They will be signed out.')) return; const o = await api(`/portal/users/${b.dataset.reset}/reset`, { method: 'POST' }); if (o.ok) { um.innerHTML = `New temporary password: <code>${h(o.temp_password)}</code>`; um.className = 'form-msg ok'; } else flash(um, o.message, false); }));
    },
    async account(v) {
      v.innerHTML = `<form class="p-card p-narrow" id="pf"><h2>Change your password</h2><div class="field"><label for="pc">Current password</label><input id="pc" name="current" type="password" required autocomplete="current-password"/></div><div class="field"><label for="pn">New password <small>(10+ characters)</small></label><input id="pn" name="next" type="password" required minlength="10" autocomplete="new-password"/></div><div class="p-row"><button class="btn btn-dark btn-sm">Update password</button></div><p class="form-msg" aria-live="polite"></p></form>
        <section class="p-card p-narrow"><h2>Your account</h2><p><b>${h(me.name)}</b><br/>${h(me.email)}<br/>${h(ROLE[me.role])}</p></section>`;
      $('#pf').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); flash($('#pf .form-msg'), o.message, o.ok); if (o.ok) e.target.reset(); });
    },
  };

  async function compose(v, replyTo) {
    const people = (await api('/portal/people')).data;
    v.innerHTML = `<form class="p-card p-narrow" id="mf"><h2>${replyTo ? 'Reply' : 'New message'}</h2><div class="field"><label for="mt">To</label><select id="mt" name="to_id" required>${people.map((p) => `<option value="${p.id}"${replyTo && replyTo.to === p.id ? ' selected' : ''}>${h(p.name)} · ${h(ROLE[p.role] || p.role)}</option>`).join('')}</select></div><div class="field"><label for="ms">Subject</label><input id="ms" name="subject" required maxlength="160" value="${h(replyTo ? replyTo.subject : '')}"/></div><div class="field"><label for="mb">Message</label><textarea id="mb" name="body" rows="6" required maxlength="8000"></textarea></div><div class="p-row"><button class="btn btn-dark btn-sm">Send</button><a class="linkish" href="#inbox">Cancel</a></div><p class="form-msg" aria-live="polite"></p></form>`;
    if (!people.length) { v.querySelector('form').innerHTML = '<p class="p-empty">There is no one to message yet.</p>'; return; }
    $('#mf').addEventListener('submit', async (e) => { e.preventDefault(); const body = Object.fromEntries(new FormData(e.target)); if (replyTo) body.thread_id = replyTo.thread; const o = await api('/portal/messages', { method: 'POST', body }); if (o.ok) location.hash = replyTo ? `#inbox/${replyTo.thread}` : '#inbox/sent'; else flash($('#mf .form-msg'), o.message, false); });
  }
  async function openThread(v, idv) {
    const out = await api(`/portal/messages/${idv}`);
    if (!out.ok) { v.innerHTML = `<p class="p-empty">${h(out.message)}</p>`; return; }
    const last = out.data[out.data.length - 1];
    const other = last.from_id === me.id ? last.to_id : last.from_id;
    $('#pActions').innerHTML = `<a class="btn btn-ghost-dark btn-sm" href="#inbox">Back to inbox</a>`;
    v.innerHTML = `<section class="p-card"><h2>${h(out.data[0].subject)}</h2>${out.data.map((m) => `<article class="p-thread-msg${m.from_id === me.id ? ' mine' : ''}"><header><b>${h(m.from_name)}</b> to ${h(m.to_name)}<time>${h(when(m.created_at))}</time></header><p class="p-pre">${h(m.body)}</p></article>`).join('')}<div class="p-row"><button type="button" class="btn btn-dark btn-sm" id="reply">Reply</button></div></section>`;
    $('#reply').addEventListener('click', () => compose(v, { to: other, subject: out.data[0].subject.startsWith('Re: ') ? out.data[0].subject : 'Re: ' + out.data[0].subject, thread: out.thread_id }));
    refreshUnread();
  }

  boot();
})();
