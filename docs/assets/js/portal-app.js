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
  // Create account
  const signupForm = $('#pSignupForm');
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = $('#pSignupMsg'), f = e.target;
    if (f.password.value !== f.password2.value) { msg.textContent = 'The two passwords don\'t match.'; msg.className = 'form-msg err'; f.password2.focus(); return; }
    msg.textContent = 'Creating your account…'; msg.className = 'form-msg';
    try {
      const res = await fetch('/api/members/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: f.name.value, email: f.email.value, password: f.password.value, website: f.website.value }) });
      const out = await res.json();
      if (!out.ok) {
        msg.textContent = out.message; msg.className = 'form-msg err';
        if (res.status === 409) { $('#pEmail').value = f.email.value; }
        return;
      }
      store.set(out.token); f.reset(); history.replaceState(null, '', location.pathname + '#home'); boot();
    } catch { msg.textContent = 'Accounts can be created on the live server. It is not available on this preview.'; msg.className = 'form-msg err'; }
  });

  // Sign in / Create account tabs (#signup opens the second one)
  const showAuth = (which) => {
    const up = which === 'signup';
    $('#pLoginForm').hidden = up; signupForm.hidden = !up;
    $('#tabSignin').setAttribute('aria-selected', String(!up)); $('#tabSignup').setAttribute('aria-selected', String(up));
    $('#pAuthTitle').textContent = up ? 'Create your account' : 'Welcome back';
    const first = up ? $('#sName') : $('#pEmail');
    if (!loginBox.hidden) setTimeout(() => first.focus(), 30);
  };
  $('#tabSignin').addEventListener('click', () => showAuth('signin'));
  $('#tabSignup').addEventListener('click', () => showAuth('signup'));
  document.querySelectorAll('[data-auth]').forEach((b) => b.addEventListener('click', () => showAuth(b.dataset.auth)));
  if (/^#(signup|register|join)$/.test(location.hash)) showAuth('signup');
  document.querySelectorAll('.pw-show').forEach((b) => b.addEventListener('click', () => {
    const input = b.previousElementSibling, show = input.type === 'password';
    input.type = show ? 'text' : 'password'; b.textContent = show ? 'Hide' : 'Show';
    b.setAttribute('aria-pressed', String(show)); b.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
  }));

  function signOut() { const t = store.get(); if (t) fetch('/api/members/logout', { method: 'POST', headers: { Authorization: 'Bearer ' + t } }).catch(() => {}); store.set(null); me = null; app.hidden = true; loginBox.hidden = false; history.replaceState(null, '', location.pathname); showAuth('signin'); }
  $('#pLogout').addEventListener('click', signOut);

  /* ---------- Shell ---------- */
  const TABS = [
    ['overview', 'Overview', 'staff'], ['coach', 'AI Coach', 'staff'], ['leads', 'Leads', 'staff'], ['calls', 'Calls', 'staff'], ['agent', 'Agent Yo', 'staff'],
    ['subscribers', 'Subscribers', 'staff'], ['outbox', 'Email outbox', 'staff'], ['home', 'Home', 'member'],
    ['inbox', 'Inbox', 'all'], ['assignments', 'Assignments', 'all'], ['community', 'Community', 'all'], ['resources', 'Resources', 'all'], ['people', 'Admin · People', 'admin'], ['media', 'Admin · Media', 'admin'], ['settings', 'Admin · Site settings', 'admin'], ['account', 'Account', 'all'],
  ];
  const A_LABEL = { todo: 'To do', in_progress: 'In progress', submitted: 'Submitted', needs_changes: 'Needs changes', done: 'Done' };
  const today = () => new Date().toISOString().slice(0, 10);
  // Coach answers: escape first, then a little Markdown (headings, bold, lists, paragraphs)
  const md = (text) => h(text).split(/\n{2,}/).map((block) => {
    const inline = (s) => s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const lines = block.split('\n');
    if (lines.every((l) => /^\s*([-*•]|\d+[.)])\s+/.test(l))) {
      const tag = /^\s*\d/.test(lines[0]) ? 'ol' : 'ul';
      return `<${tag}>${lines.map((l) => `<li>${inline(l.replace(/^\s*([-*•]|\d+[.)])\s+/, ''))}</li>`).join('')}</${tag}>`;
    }
    const head = block.match(/^#{1,4}\s+(.*)$/);
    if (head && lines.length === 1) return `<h3>${inline(head[1])}</h3>`;
    return `<p>${lines.map((l) => (/^#{1,4}\s+/.test(l) ? `<b>${inline(l.replace(/^#{1,4}\s+/, ''))}</b>` : inline(l))).join('<br/>')}</p>`;
  }).join('');
  const suggestionCard = (sg, compact) => `<article class="p-sg ${h(sg.priority)}"><header><span class="p-sg-pri">${h(sg.priority)}</span><span class="p-sg-area">${h(sg.area)}</span></header><b>${h(sg.title)}</b>${compact ? '' : `<p>${h(sg.why)}</p>`}<p class="p-sg-act">${h(sg.action)}</p><div class="p-sg-links"><a class="link-arrow" href="${h(sg.link)}">Open</a>${sg.ask ? `<button type="button" class="linkish" data-ask="${h(sg.ask)}">Ask the coach</button>` : ''}</div></article>`;
  let coachHistory = [];
  // Profile picture, or initials when there isn't one
  const initials = (name) => String(name || '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const safeImg = (u) => (/^\/uploads\/avatars\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(u || '') ? u : '');
  const ava = (person, cls = 'p-ava-sm', idAttr = '') => {
    const img = safeImg(person && (person.avatar || person.author_avatar || person.from_avatar));
    const name = person && (person.name || person.author || person.from_name);
    return `<span class="${cls}${img ? ' has-img' : ''}"${idAttr ? ` id="${idAttr}"` : ''} aria-hidden="true">${img ? `<img src="${h(img)}" alt="" loading="lazy"/>` : h(initials(name))}</span>`;
  };
  // Shrink a picture in the browser to a 400×400 square JPEG before uploading
  const squareJpeg = (file, size = 400) => new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => {
      const s = Math.min(img.naturalWidth, img.naturalHeight), c = document.createElement('canvas');
      c.width = c.height = size;
      c.getContext('2d').drawImage(img, (img.naturalWidth - s) / 2, (img.naturalHeight - s) / 2, s, s, 0, 0, size, size);
      URL.revokeObjectURL(url);
      c.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not read that picture.'))), 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Please choose a picture file (JPG, PNG, HEIC or WebP).')); };
    img.src = url;
  });
  // Upload a file body with progress (fetch can't report upload progress)
  const sendFile = (path, blob, onProgress) => new Promise((resolve) => {
    const x = new XMLHttpRequest();
    x.open('POST', '/api' + path);
    x.setRequestHeader('Authorization', 'Bearer ' + (store.get() || ''));
    x.setRequestHeader('Content-Type', blob.type || 'application/octet-stream');
    x.upload.onprogress = (e) => { if (e.lengthComputable && onProgress) onProgress(e.loaded / e.total); };
    x.onload = () => { let out; try { out = JSON.parse(x.responseText); } catch { out = { ok: false, message: 'Upload failed.' }; } resolve(out); };
    x.onerror = () => resolve({ ok: false, message: 'The upload was interrupted. Please check your connection and try again.' });
    x.send(blob);
  });
  const isStaff = () => me && (me.role === 'admin' || me.role === 'team');
  const allowed = (who) => who === 'all' || (who === 'staff' && isStaff()) || (who === 'member' && !isStaff()) || (who === 'admin' && me.role === 'admin');

  async function boot() {
    if (!store.get()) { loginBox.hidden = false; app.hidden = true; return; }
    try {
      const out = await api('/portal/me');
      if (!out.ok) throw new Error(out.message);
      me = out.member;
      $('#pName').textContent = me.name; $('#pRole').textContent = ROLE[me.role] || me.role;
      $('#pAva').outerHTML = ava(me, 'p-ava', 'pAva');
      $('#pNav').innerHTML = TABS.filter(([, , who]) => allowed(who)).map(([k, label]) => `<a href="#${k}" data-tab="${k}">${h(label)}${k === 'inbox' ? `<span class="p-badge" id="pUnread"${out.unread ? '' : ' hidden'}>${out.unread}</span>` : ''}${k === 'assignments' ? `<span class="p-badge" id="pOpenA"${out.open_assignments ? '' : ' hidden'}>${out.open_assignments}</span>` : ''}</a>`).join('');
      loginBox.hidden = true; app.hidden = false;
      route();
    } catch { if (!store.get()) return; loginBox.hidden = false; app.hidden = true; }
  }
  // Phones: the section list opens from a menu button instead of a sideways strip
  const setNavOpen = (open) => { $('.p-side').classList.toggle('nav-open', open); $('#pNavToggle').setAttribute('aria-expanded', String(open)); };
  $('#pNavToggle').addEventListener('click', () => setNavOpen(!$('.p-side').classList.contains('nav-open')));
  addEventListener('hashchange', route);
  function route() {
    if (!me) return;
    const first = isStaff() ? 'overview' : 'home';
    let tab = location.hash.slice(1).split('/')[0] || first;
    const def = TABS.find(([k]) => k === tab);
    if (!def || !allowed(def[2])) tab = first;
    document.querySelectorAll('#pNav a').forEach((a) => a.toggleAttribute('aria-current', a.dataset.tab === tab));
    $('#pTitle').textContent = TABS.find(([k]) => k === tab)[1]; $('#pActions').innerHTML = '';
    $('#pNavCurrent').textContent = TABS.find(([k]) => k === tab)[1]; setNavOpen(false);
    const view = $('#pView'); view.innerHTML = '<p class="p-loading">Loading…</p>';
    (VIEWS[tab] || VIEWS.home)(view, location.hash.split('/')[1]).catch((err) => { view.innerHTML = `<p class="form-msg err">${h(err.message)}</p>`; });
  }
  const refreshUnread = async () => {
    const out = await api('/portal/me');
    [['#pUnread', out.unread], ['#pOpenA', out.open_assignments]].forEach(([sel, n]) => { const b = $(sel); if (b) { b.textContent = n; b.hidden = !n; } });
  };
  // "Ask the coach" buttons anywhere in the portal open the coach with that question
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ask]'); if (!b) return;
    sessionStorage.setItem('yoCoachAsk', b.dataset.ask);
    if (location.hash === '#coach') route(); else location.hash = '#coach';
  });

  /* ---------- Small UI helpers ---------- */
  const kpi = (label, value, note = '') => `<div class="p-kpi"><span>${h(label)}</span><b>${h(value)}</b>${note ? `<small>${h(note)}</small>` : ''}</div>`;
  const table = (cols, rows, empty = 'Nothing here yet.') => rows.length ? `<div class="p-table-wrap"><table class="p-table"><thead><tr>${cols.map(([l]) => `<th>${h(l)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map(([l, f]) => `<td data-label="${h(l)}">${f(r)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p class="p-empty">${h(empty)}</p>`;
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
      const [o, c] = await Promise.all([api('/portal/overview'), api('/portal/coach')]); const k = o.kpis;
      v.innerHTML = `<div class="p-kpis">${kpi('New inquiries', k.new_inquiries)}${kpi('Hot leads', k.hot_leads, 'score 60+')}${kpi('Upcoming calls', k.upcoming_calls)}${kpi('Subscribers', k.subscribers)}${kpi('Open assignments', k.open_assignments, k.to_review ? k.to_review + ' to review' : '')}${kpi('Agent Yo conversion', o.agent.conversion_rate + '%', o.agent.sessions + ' chats')}${kpi('Emails waiting', k.queued_emails, 'outbox')}</div>
        <section class="p-card p-coach-strip"><div class="p-coach-head"><h2><span class="p-spark" aria-hidden="true">✦</span> Today's suggestions</h2><a class="link-arrow" href="#coach">Open AI Coach</a></div><div class="p-sg-grid">${c.suggestions.slice(0, 3).map((sg) => suggestionCard(sg, true)).join('')}</div></section>
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
    async coach(v) {
      const c = await api('/portal/coach');
      const starters = ['Prepare me for my next discovery call', 'Draft a follow-up email to my hottest lead', 'Give me 3 podcast episode ideas from what visitors ask', 'Write a 90-second opening story for my keynote', 'What should I focus on this week?'];
      v.innerHTML = `<section class="p-card p-coach-hero"><span class="p-spark big" aria-hidden="true">✦</span><div><h2>Good ${new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 17 ? 'afternoon' : 'evening'}, ${h(me.name.split(' ')[0])}.</h2><p>Here is what deserves your attention, based on your leads, calls, team and what visitors are asking Agent Yo.</p></div></section>
        <div class="p-sg-grid">${c.suggestions.map((sg) => suggestionCard(sg)).join('')}</div>
        <section class="p-card p-coach-chat"><h2>Ask your coach</h2><p class="fine">${c.ai ? 'Call prep, follow-up emails, talk ideas, content plans. The coach sees your live leads, calls and visitor questions.' : 'The AI Coach answers once ANTHROPIC_API_KEY is added on the server. The suggestions above already work.'}</p>
          <div class="p-chips">${starters.map((s) => `<button type="button" class="p-chip" data-starter="${h(s)}">${h(s)}</button>`).join('')}</div>
          <div class="p-coach-log" id="coachLog" aria-live="polite">${coachHistory.map((t) => `<div class="p-line ${t.role}"><span>${t.role === 'user' ? 'You' : 'AI Coach'}</span>${t.role === 'user' ? h(t.text) : md(t.text)}</div>`).join('')}</div>
          <form id="coachForm" class="p-coach-form"><label class="sr" for="coachQ">Ask the coach</label><textarea id="coachQ" name="q" rows="3" maxlength="4000" required placeholder="e.g. Help me prepare for my call with Dana on Thursday"></textarea><div class="p-row"><button class="btn btn-dark btn-sm">Ask</button>${coachHistory.length ? '<button type="button" class="linkish" id="coachClear">Start over</button>' : ''}<span class="form-msg" aria-live="polite"></span></div></form></section>`;
      const form = $('#coachForm'), log = $('#coachLog'), q = $('#coachQ');
      const ask = async (text) => {
        const msg = form.querySelector('.form-msg'); msg.textContent = 'Thinking…'; msg.className = 'form-msg';
        form.querySelector('button').disabled = true;
        log.insertAdjacentHTML('beforeend', `<div class="p-line user"><span>You</span>${h(text)}</div>`);
        const out = await api('/portal/coach/ask', { method: 'POST', body: { question: text, history: coachHistory } }).catch((e) => ({ ok: false, message: e.message }));
        form.querySelector('button').disabled = false;
        if (!out.ok) { flash(msg, out.message, false); log.lastElementChild.remove(); return; }
        coachHistory.push({ role: 'user', text }, { role: 'assistant', text: out.answer }); coachHistory = coachHistory.slice(-12);
        log.insertAdjacentHTML('beforeend', `<div class="p-line assistant"><span>AI Coach</span>${md(out.answer)}</div>`);
        msg.textContent = out.truncated ? 'The answer was long and got cut off. Ask it to continue.' : ''; q.value = '';
        log.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      form.addEventListener('submit', (e) => { e.preventDefault(); if (q.value.trim()) ask(q.value.trim()); });
      v.querySelectorAll('[data-starter]').forEach((b) => b.addEventListener('click', () => ask(b.dataset.starter)));
      const clear = $('#coachClear'); if (clear) clear.addEventListener('click', () => { coachHistory = []; route(); });
      const pending = sessionStorage.getItem('yoCoachAsk');
      if (pending) { sessionStorage.removeItem('yoCoachAsk'); q.value = pending; form.scrollIntoView({ block: 'center' }); q.focus(); }
    },
    async assignments(v, sub) {
      const staffView = isStaff() && sub !== 'mine';
      const [out, people] = await Promise.all([api(`/portal/assignments${staffView ? '' : '?view=mine'}`), isStaff() ? api('/portal/people') : Promise.resolve({ data: [] })]);
      if (isStaff()) $('#pActions').innerHTML = `<div class="seg" role="tablist"><a role="tab" href="#assignments" aria-selected="${staffView}">Everyone</a><a role="tab" href="#assignments/mine" aria-selected="${!staffView}">Assigned to me</a></div>`;
      const rows = out.data;
      const counts = Object.fromEntries(Object.keys(A_LABEL).map((s) => [s, rows.filter((r) => r.status === s).length]));
      const due = (r) => r.due_date ? `<span class="p-due${r.status !== 'done' && r.due_date < today() ? ' late' : ''}">${r.status !== 'done' && r.due_date < today() ? 'Overdue · ' : 'Due '}${h(r.due_date)}</span>` : '';
      const card = (r) => {
        const mine = r.assigned_to === me.id;
        return `<article class="p-card p-asg ${h(r.status)}" id="a${r.id}">
          <header><span class="p-pill ${h(r.status)}">${h(A_LABEL[r.status])}</span>${due(r)}<time>${h(when(r.updated_at))}</time></header>
          <h3>${h(r.title)}</h3>
          <p class="p-asg-who">${mine ? 'For you' : `For <b>${h(r.assigned_to_name)}</b>`} · from ${h(r.assigned_by_name || 'the team')}</p>
          ${r.details ? `<p class="p-pre">${h(r.details)}</p>` : ''}
          ${r.submission ? `<div class="p-asg-box"><span>Submitted work</span><p class="p-pre">${h(r.submission)}</p></div>` : ''}
          ${r.feedback ? `<div class="p-asg-box fb"><span>Feedback</span><p class="p-pre">${h(r.feedback)}</p></div>` : ''}
          ${mine && r.status !== 'done' ? `<form class="p-asg-form" data-a="${r.id}"><label for="sub${r.id}">Your work: a note or a link</label><textarea id="sub${r.id}" name="submission" rows="3" maxlength="8000">${h(r.submission)}</textarea>
            <div class="p-row">${r.status === 'todo' ? `<button type="button" class="btn btn-ghost-dark btn-sm" data-status="in_progress">Start</button>` : ''}<button class="btn btn-dark btn-sm" data-status="submitted">${r.status === 'submitted' ? 'Update submission' : 'Submit'}</button><span class="form-msg" aria-live="polite"></span></div></form>` : ''}
          ${isStaff() && !mine ? `<form class="p-asg-form" data-a="${r.id}"><label for="fb${r.id}">Feedback</label><textarea id="fb${r.id}" name="feedback" rows="2" maxlength="8000">${h(r.feedback)}</textarea>
            <div class="p-row"><button class="btn btn-dark btn-sm" data-status="done">Mark done</button><button class="btn btn-ghost-dark btn-sm" data-status="needs_changes">Needs changes</button><button type="button" class="linkish" data-fbonly>Save feedback</button><button type="button" class="linkish" data-adel="${r.id}">Delete</button><span class="form-msg" aria-live="polite"></span></div></form>` : ''}
        </article>`;
      };
      v.innerHTML = `${isStaff() ? `<form class="p-card" id="af"><h2>New assignment</h2><div class="row2"><div class="field"><label for="at">Title</label><input id="at" name="title" required maxlength="160" placeholder="e.g. Record your 2-minute signature story"/></div><div class="field"><label for="ato">Assign to</label><select id="ato" name="assigned_to" required>${people.data.map((p) => `<option value="${p.id}">${h(p.name)} · ${h(ROLE[p.role] || p.role)}</option>`).join('')}</select></div></div>
          <div class="row2"><div class="field"><label for="ad">Details</label><textarea id="ad" name="details" rows="3" maxlength="8000" placeholder="What to do, and what good looks like"></textarea></div><div class="field"><label for="adue">Due date</label><input id="adue" name="due_date" type="date"/></div></div>
          <div class="p-row"><button class="btn btn-dark btn-sm">Assign</button><span class="form-msg" aria-live="polite"></span></div></form>` : ''}
        <div class="p-asg-stats">${['todo', 'in_progress', 'submitted', 'needs_changes', 'done'].map((s) => `<span class="p-pill ${s}">${A_LABEL[s]} · ${counts[s]}</span>`).join('')}</div>
        <div class="p-asg-list">${rows.map(card).join('') || `<p class="p-empty">${isStaff() ? 'No assignments yet. Create the first one above.' : 'No assignments yet. When Yo\'s team gives you work, it appears here.'}</p>`}</div>`;
      if (isStaff() && $('#af')) $('#af').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/assignments', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); if (o.ok) route(); else flash($('#af .form-msg'), o.message, false); });
      v.querySelectorAll('.p-asg-form').forEach((f) => {
        const save = async (body) => { const o = await api(`/portal/assignments/${f.dataset.a}`, { method: 'PATCH', body }); if (o.ok) { await refreshUnread(); route(); } else flash(f.querySelector('.form-msg'), o.message, false); };
        f.addEventListener('submit', (e) => { e.preventDefault(); const st = (e.submitter && e.submitter.dataset.status) || 'submitted'; save({ status: st, ...Object.fromEntries(new FormData(f)) }); });
        f.querySelectorAll('button[type="button"][data-status]').forEach((b) => b.addEventListener('click', () => save({ status: b.dataset.status })));
        const fbOnly = f.querySelector('[data-fbonly]'); if (fbOnly) fbOnly.addEventListener('click', () => save({ feedback: f.feedback.value }));
        const del = f.querySelector('[data-adel]'); if (del) del.addEventListener('click', async () => { if (confirm('Delete this assignment?')) { await api(`/portal/assignments/${del.dataset.adel}`, { method: 'DELETE' }); route(); } });
      });
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
      const [res, msgs, asg] = await Promise.all([api('/portal/resources'), api('/portal/messages'), api('/portal/assignments?view=mine')]);
      const open = asg.data.filter((a) => a.status !== 'done');
      v.innerHTML = `<section class="p-card p-welcome"><h2>Welcome, ${h(me.name.split(' ')[0])}.</h2><p>Your programs: <b>${h(me.programs || 'none yet')}</b></p><div class="hero-ctas"><a class="btn btn-dark btn-sm" href="#inbox/new">Message the team</a><a class="btn btn-ghost-dark btn-sm" href="#community">Visit the community</a></div></section>
        <section class="p-card"><h2>Your assignments</h2>${open.slice(0, 5).map((a) => `<a class="p-res" href="#assignments"><b>${h(a.title)}</b><small>${h(A_LABEL[a.status])}${a.due_date ? ' · due ' + h(a.due_date) : ''}</small></a>`).join('') || '<p class="p-empty">Nothing assigned right now.</p>'}</section>
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
        <div id="feed">${out.data.map((p) => `<article class="p-card p-post${p.pinned ? ' pinned' : ''}"><header>${ava(p)}<b>${h(p.author)}</b><span class="p-role-sm">${h(ROLE[p.author_role] || '')}</span><time>${h(when(p.created_at))}</time>${p.pinned ? '<span class="p-pill">Pinned</span>' : ''}</header><p class="p-pre">${h(p.body)}</p>
          <div class="p-post-actions">${isStaff() ? `<button type="button" class="linkish" data-pin="${p.id}">${p.pinned ? 'Unpin' : 'Pin'}</button>` : ''}${p.mine || isStaff() ? `<button type="button" class="linkish" data-del="${p.id}">Delete</button>` : ''}</div>
          <div class="p-comments">${p.comments.map((c) => `<p>${ava(c, 'p-ava-xs')}<b>${h(c.author)}</b> ${h(c.body)}</p>`).join('')}<form data-comment="${p.id}"><label class="sr" for="cm${p.id}">Comment</label><input id="cm${p.id}" name="body" placeholder="Write a comment…" maxlength="2000" required/><button class="btn btn-ghost-dark btn-sm">Reply</button></form></div></article>`).join('') || '<p class="p-empty">Be the first to post.</p>'}</div>`;
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
        <section class="p-card"><h2>Everyone (${out.data.length})</h2><div class="p-tools"><input type="search" id="uq" placeholder="Search name or email"/></div><p class="form-msg" id="um" aria-live="polite"></p>
          <div class="p-users">${out.data.map((r) => `<article class="p-urow" data-id="${r.id}" data-q="${h((r.name + ' ' + r.email).toLowerCase())}">
            ${ava(r, 'p-ava-md')}
            <div class="p-ufields"><label class="sr" for="n${r.id}">Name</label><input id="n${r.id}" data-field="name" value="${h(r.name)}" maxlength="120"/><label class="sr" for="e${r.id}">Email</label><input id="e${r.id}" data-field="email" type="email" value="${h(r.email)}" maxlength="160"/></div>
            <div class="p-uctl">
              <label><span>Role</span><select data-field="role">${['member', 'team', 'admin'].map((x) => `<option value="${x}"${x === r.role ? ' selected' : ''}>${ROLE[x]}</option>`).join('')}</select></label>
              <label><span>Status</span><select data-field="status">${['active', 'paused'].map((x) => `<option${x === r.status ? ' selected' : ''}>${x}</option>`).join('')}</select></label>
              <label class="p-uprog"><span>Programs</span><input data-field="programs" value="${h(r.programs || '')}" maxlength="300"/></label>
            </div>
            <div class="p-uacts">${r.id === me.id ? '<span class="p-pill">You</span>' : ''}<button type="button" class="linkish" data-act="reset">Reset password</button>${r.avatar ? '<button type="button" class="linkish" data-act="noava">Remove picture</button>' : ''}${r.id !== me.id ? '<button type="button" class="linkish danger" data-act="delete">Delete account</button>' : ''}</div>
          </article>`).join('')}</div></section>`;
      const um = $('#um');
      $('#uf').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/users', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); const msg = $('#uf .form-msg'); if (o.ok) { msg.innerHTML = `Created. Temporary password: <code>${h(o.temp_password)}</code><br/>Share it privately; it won't be shown again.`; msg.className = 'form-msg ok'; e.target.reset(); } else flash(msg, o.message, false); });
      $('#bf').addEventListener('submit', async (e) => { e.preventDefault(); if (!confirm('Send this message to every account?')) return; const o = await api('/portal/broadcast', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); flash($('#bf .form-msg'), o.message, o.ok); if (o.ok) e.target.reset(); });
      $('#uq').addEventListener('input', (e) => { const q = e.target.value.trim().toLowerCase(); v.querySelectorAll('.p-urow').forEach((row) => { row.hidden = q && !row.dataset.q.includes(q); }); });
      v.querySelectorAll('.p-urow').forEach((row) => {
        const uid = row.dataset.id;
        row.querySelectorAll('[data-field]').forEach((f) => f.addEventListener('change', async () => {
          const o = await api(`/portal/users/${uid}`, { method: 'PATCH', body: { [f.dataset.field]: f.value } });
          flash(um, o.ok ? 'Saved.' : o.message, o.ok); f.classList.toggle('saved', !!o.ok); setTimeout(() => f.classList.remove('saved'), 1200);
          if (!o.ok) route(); else if (Number(uid) === me.id && ['name', 'email'].includes(f.dataset.field)) { me[f.dataset.field] = f.value; $('#pName').textContent = me.name; }
        }));
        row.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', async () => {
          const name = row.querySelector('[data-field="name"]').value;
          if (b.dataset.act === 'reset') {
            if (!confirm(`Reset ${name}'s password? They will be signed out.`)) return;
            const o = await api(`/portal/users/${uid}/reset`, { method: 'POST' });
            if (o.ok) { um.innerHTML = `New temporary password for ${h(name)}: <code>${h(o.temp_password)}</code>`; um.className = 'form-msg ok'; } else flash(um, o.message, false);
          } else if (b.dataset.act === 'noava') {
            const o = await api(`/portal/users/${uid}/avatar`, { method: 'DELETE' }); flash(um, o.message, o.ok); if (o.ok) route();
          } else if (b.dataset.act === 'delete') {
            if (!confirm(`Delete ${name}'s account for good? Their messages are deleted too. This can't be undone.`)) return;
            const o = await api(`/portal/users/${uid}`, { method: 'DELETE' }); flash(um, o.message, o.ok); if (o.ok) row.remove();
          }
        }));
      });
    },
    async media(v) {
      const out = await api('/portal/media');
      const videos = out.data.filter((x) => x.kind === 'video'), photos = out.data.filter((x) => x.kind === 'photo');
      const places = (it) => ['watch', 'about'].map((p) => `<label class="p-place"><input type="checkbox" data-place="${p}"${it.show_on.includes(p) ? ' checked' : ''}/> ${p === 'watch' ? 'Watch page' : 'About page'}</label>`).join('');
      const thumb = (it) => (it.thumb ? `<img src="${h(it.thumb)}" alt="" loading="lazy"/>` : '<span>▶</span>');
      v.innerHTML = `<p class="fine">Videos and photos you add here appear on the <a href="/watch/" target="_blank" rel="noopener">Watch page</a> and the <a href="/about/" target="_blank" rel="noopener">About page</a>. To change words or photos on any page, open the page while signed in and press <b>Edit this page</b>.</p>
        <div class="p-grid2">
          <form class="p-card" id="vf"><h2 id="vfTitle">Add a video</h2><input type="hidden" name="editId"/>
            <div class="field"><label for="vt">Title</label><input id="vt" name="title" required maxlength="160" placeholder="e.g. Credit, Capital & Confidence: keynote highlights"/></div>
            <div class="field"><label for="vd">Description</label><textarea id="vd" name="description" rows="3" maxlength="2000"></textarea></div>
            <div class="row2"><div class="field"><label for="vc">Category</label><input id="vc" name="category" maxlength="60" list="vcats" placeholder="e.g. Keynotes, Interviews, Lessons"/><datalist id="vcats">${[...new Set(videos.map((x) => x.category).filter(Boolean))].map((c) => `<option value="${h(c)}">`).join('')}</datalist></div>
              <div class="field"><label for="vl">Video link</label><input id="vl" name="src" placeholder="YouTube, Vimeo or .mp4 link"/></div></div>
            <div class="p-row"><label class="btn btn-ghost-dark btn-sm p-file">Or upload a video<input type="file" data-up="videos" accept="video/mp4,video/webm" hidden/></label><label class="btn btn-ghost-dark btn-sm p-file">Cover photo (optional)<input type="file" data-up="thumb" accept="image/jpeg,image/png,image/webp" hidden/></label></div>
            <input type="hidden" name="thumb"/>
            <div class="p-progress" hidden><span></span></div>
            <p class="fine" id="vfFiles"></p>
            <div class="p-row"><span>Show on:</span>${places({ show_on: ['watch'] })}<label class="p-place"><input type="checkbox" name="featured"/> Featured</label></div>
            <div class="p-row"><button class="btn btn-dark btn-sm" id="vfSave">Add video</button><button type="button" class="linkish" id="vfCancel" hidden>Cancel editing</button><span class="form-msg" aria-live="polite"></span></div>
          </form>
          <form class="p-card" id="phf"><h2>Add photos</h2>
            <p class="fine">Choose one or more photos (JPG, PNG or WebP, up to 12 MB each). Add a caption if you like.</p>
            <div class="field"><label for="phc">Caption (optional)</label><input id="phc" name="title" maxlength="160" placeholder="e.g. Women in Business Summit 2026"/></div>
            <div class="p-row"><span>Show on:</span>${places({ show_on: ['watch', 'about'] })}</div>
            <div class="p-row"><label class="btn btn-dark btn-sm p-file">Choose photos<input type="file" id="phFiles" accept="image/jpeg,image/png,image/webp" multiple hidden/></label><span class="form-msg" aria-live="polite"></span></div>
            <div class="p-progress" hidden><span></span></div>
          </form>
        </div>
        <section class="p-card"><h2>Videos (${videos.length})</h2>${videos.length ? `<div class="p-lib">${videos.map((it, i) => `<article class="p-li" data-id="${it.id}">
            <div class="p-li-thumb">${thumb(it)}${it.featured ? '<span class="p-pill submitted">Featured</span>' : ''}</div>
            <div class="p-li-body"><b>${h(it.title)}</b><small>${h(it.category || 'No category')} · ${h(it.video ? (it.video.kind === 'file' ? (it.raw_src.startsWith('/uploads/') ? 'Uploaded file' : 'Video link') : it.video.kind === 'youtube' ? 'YouTube' : 'Vimeo') : 'Link not playable')}</small>
              <div class="p-row">${places(it)}</div>
              <div class="p-row"><button type="button" class="linkish" data-do="edit">Edit</button>${it.featured ? '' : '<button type="button" class="linkish" data-do="feature">Make featured</button>'}${i ? '<button type="button" class="linkish" data-do="up">Move up</button>' : ''}${i < videos.length - 1 ? '<button type="button" class="linkish" data-do="down">Move down</button>' : ''}<button type="button" class="linkish danger" data-do="delete">Delete</button></div></div>
          </article>`).join('')}</div>` : '<p class="p-empty">No videos yet. Add your first one above.</p>'}</section>
        <section class="p-card"><h2>Photos (${photos.length})</h2>${photos.length ? `<div class="p-phlib">${photos.map((it, i) => `<article class="p-li p-li-ph" data-id="${it.id}">
            <img src="${h(it.src)}" alt="" loading="lazy"/>
            <label class="sr" for="cap${it.id}">Caption</label><input id="cap${it.id}" data-cap value="${h(it.title)}" placeholder="Caption" maxlength="160"/>
            <div class="p-row">${places(it)}</div>
            <div class="p-row">${i ? '<button type="button" class="linkish" data-do="up">←</button>' : ''}${i < photos.length - 1 ? '<button type="button" class="linkish" data-do="down">→</button>' : ''}<button type="button" class="linkish danger" data-do="delete">Delete</button></div>
          </article>`).join('')}</div>` : '<p class="p-empty">No photos yet.</p>'}</section>`;

      // ---- Add / edit a video ----
      const vf = $('#vf'), vmsg = vf.querySelector('.form-msg'), vbar = vf.querySelector('.p-progress');
      let uploadedVideo = '';
      const showFiles = () => { $('#vfFiles').textContent = [uploadedVideo && 'Video file ready', vf.thumb.value && 'Cover photo ready'].filter(Boolean).join(' · '); };
      vf.querySelectorAll('[data-up]').forEach((inp) => inp.addEventListener('change', async () => {
        const file = inp.files[0]; if (!file) return;
        vbar.hidden = false; flash(vmsg, 'Uploading…');
        const o = await sendFile(`/portal/uploads?kind=${inp.dataset.up === 'videos' ? 'videos' : 'photos'}`, file, (p) => { vbar.firstElementChild.style.width = Math.round(p * 100) + '%'; vmsg.textContent = `Uploading… ${Math.round(p * 100)}%`; });
        vbar.hidden = true;
        if (!o.ok) { flash(vmsg, o.message, false); return; }
        if (inp.dataset.up === 'videos') { uploadedVideo = o.url; vf.src.value = ''; } else vf.thumb.value = o.url;
        flash(vmsg, 'Uploaded.'); showFiles();
      }));
      const resetForm = () => { vf.reset(); vf.editId.value = ''; vf.thumb.value = ''; uploadedVideo = ''; $('#vfTitle').textContent = 'Add a video'; $('#vfSave').textContent = 'Add video'; $('#vfCancel').hidden = true; showFiles(); vf.querySelector('[data-place="watch"]').checked = true; };
      $('#vfCancel').addEventListener('click', resetForm);
      vf.addEventListener('submit', async (e) => {
        e.preventDefault();
        const body = { kind: 'video', title: vf.title.value, description: vf.description.value, category: vf.category.value, featured: vf.featured.checked, thumb: vf.thumb.value,
          show_on: [...vf.querySelectorAll('[data-place]:checked')].map((c) => c.dataset.place) };
        const src = uploadedVideo || vf.src.value.trim();
        if (src) body.src = src; else if (!vf.editId.value) { flash(vmsg, 'Paste a video link or upload a video.', false); return; }
        flash(vmsg, 'Saving…');
        const o = vf.editId.value ? await api(`/portal/media/${vf.editId.value}`, { method: 'PATCH', body }) : await api('/portal/media', { method: 'POST', body });
        flash(vmsg, o.message, o.ok); if (o.ok) setTimeout(route, 600);
      });

      // ---- Add photos ----
      const phf = $('#phf'), pmsg = phf.querySelector('.form-msg'), pbar = phf.querySelector('.p-progress');
      $('#phFiles').addEventListener('change', async (e) => {
        const files = [...e.target.files]; if (!files.length) return;
        const show_on = [...phf.querySelectorAll('[data-place]:checked')].map((c) => c.dataset.place);
        pbar.hidden = false; let done = 0;
        for (const file of files) {
          flash(pmsg, `Uploading ${done + 1} of ${files.length}…`);
          const up = await sendFile('/portal/uploads?kind=photos', file, (p) => { pbar.firstElementChild.style.width = Math.round(((done + p) / files.length) * 100) + '%'; });
          if (!up.ok) { flash(pmsg, `${file.name}: ${up.message}`, false); continue; }
          await api('/portal/media', { method: 'POST', body: { kind: 'photo', src: up.url, title: phf.title.value, show_on } });
          done++;
        }
        pbar.hidden = true; flash(pmsg, `${done} photo${done === 1 ? '' : 's'} added.`, done > 0); if (done) setTimeout(route, 700);
      });

      // ---- Library actions ----
      const reorder = async (list, idx, dir) => {
        const ids = list.map((x) => x.id); const j = idx + dir;
        [ids[idx], ids[j]] = [ids[j], ids[idx]];
        await Promise.all(ids.map((mid, k) => api(`/portal/media/${mid}`, { method: 'PATCH', body: { sort: k } })));
        route();
      };
      v.querySelectorAll('.p-li').forEach((row) => {
        const mid = Number(row.dataset.id), it = out.data.find((x) => x.id === mid), list = it.kind === 'video' ? videos : photos, idx = list.indexOf(it);
        row.querySelectorAll('[data-place]').forEach((c) => c.addEventListener('change', async () => {
          const o = await api(`/portal/media/${mid}`, { method: 'PATCH', body: { show_on: [...row.querySelectorAll('[data-place]:checked')].map((x) => x.dataset.place) } });
          if (!o.ok) { alert(o.message); route(); }
        }));
        const cap = row.querySelector('[data-cap]');
        if (cap) cap.addEventListener('change', async () => { const o = await api(`/portal/media/${mid}`, { method: 'PATCH', body: { title: cap.value } }); cap.classList.toggle('saved', !!o.ok); setTimeout(() => cap.classList.remove('saved'), 1200); });
        row.querySelectorAll('[data-do]').forEach((b) => b.addEventListener('click', async () => {
          const act = b.dataset.do;
          if (act === 'delete') { if (confirm('Delete this from the website?')) { await api(`/portal/media/${mid}`, { method: 'DELETE' }); route(); } }
          else if (act === 'feature') { await api(`/portal/media/${mid}`, { method: 'PATCH', body: { featured: true } }); route(); }
          else if (act === 'up' || act === 'down') reorder(list, idx, act === 'up' ? -1 : 1);
          else if (act === 'edit') {
            resetForm(); vf.editId.value = mid; vf.title.value = it.title; vf.description.value = it.description; vf.category.value = it.category;
            vf.src.value = it.raw_src.startsWith('/uploads/') ? '' : it.raw_src; vf.thumb.value = it.raw_thumb || ''; vf.featured.checked = it.featured;
            vf.querySelectorAll('[data-place]').forEach((c) => { c.checked = it.show_on.includes(c.dataset.place); });
            $('#vfTitle').textContent = 'Edit video'; $('#vfSave').textContent = 'Save changes'; $('#vfCancel').hidden = false;
            $('#vfFiles').textContent = it.raw_src.startsWith('/uploads/') ? 'Using the uploaded video file. Paste a link or upload to replace it.' : '';
            vf.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }));
      });
    },
    async settings(v) {
      const out = await api('/portal/settings'); const s = out.data;
      const slots = [['hero_video', 'Homepage background video', 'Plays behind the big headline on the homepage.'], ['page_video', 'Page header video', 'Optional. Plays behind the title at the top of every other page.']];
      const preview = (view) => {
        if (!view) return '<p class="p-empty">No video yet.</p>';
        if (view.kind === 'file') return `<video src="${h(view.src)}" muted loop autoplay playsinline></video>`;
        const src = view.kind === 'youtube' ? `https://www.youtube-nocookie.com/embed/${h(view.id)}?autoplay=1&mute=1&loop=1&playlist=${h(view.id)}&controls=0&playsinline=1` : `https://player.vimeo.com/video/${h(view.id)}?background=1&autoplay=1&loop=1&muted=1`;
        return `<iframe src="${src}" title="Video preview" allow="autoplay; encrypted-media"></iframe>`;
      };
      v.innerHTML = `${slots.map(([slot, title, note]) => `<section class="p-card p-vid" data-slot="${slot}">
          <div class="p-vid-in">
            <div><h2>${title}</h2><p class="fine">${note}</p>
              <form class="p-vid-link"><label for="l_${slot}">Video link</label><div class="p-row"><input id="l_${slot}" name="link" value="${h(/^\/uploads\//.test(s[slot]) ? '' : s[slot])}" placeholder="YouTube, Vimeo, or a link to an .mp4 / .webm file"/><button class="btn btn-dark btn-sm">Use this link</button></div></form>
              <div class="p-vid-or"><span>or</span></div>
              <label class="btn btn-ghost-dark btn-sm p-file">Upload a video file<input type="file" accept="video/mp4,video/webm" hidden/></label>
              <div class="p-progress" hidden><span></span></div>
              <p class="fine">${/^\/uploads\//.test(s[slot]) ? 'Now playing: an uploaded file.' : s[slot] ? 'Now playing: the link above.' : 'Nothing set.'} MP4 or WebM, up to 200 MB. Short loops (10–30 seconds) without sound work best.</p>
              <div class="p-row">${s[slot] ? '<button type="button" class="linkish danger" data-clear>Remove video</button>' : ''}<span class="form-msg" aria-live="polite"></span></div>
            </div>
            <div class="p-vid-prev">${preview(out.view[slot])}</div>
          </div></section>`).join('')}
        <form class="p-card" id="sf"><h2>Video strength and announcement</h2>
          <div class="field"><label for="vs">How strongly the video shows: <b id="vsOut">${h(s.video_strength)}%</b></label><input id="vs" name="video_strength" type="range" min="10" max="90" step="2" value="${h(s.video_strength)}"/></div>
          <label class="check"><input type="checkbox" name="announce_on"${s.announce_on === '1' ? ' checked' : ''}/> <span>Show an announcement bar at the top of every page</span></label>
          <div class="row2"><div class="field"><label for="at2">Announcement text</label><input id="at2" name="announce_text" maxlength="160" value="${h(s.announce_text)}" placeholder="e.g. Yo is speaking at the Women in Business Summit, March 12"/></div><div class="field"><label for="al2">Link (optional)</label><input id="al2" name="announce_link" value="${h(s.announce_link)}" placeholder="/events/ or https://"/></div></div>
          <div class="p-row"><button class="btn btn-dark btn-sm">Save</button><a class="linkish" href="/" target="_blank" rel="noopener">Open the website</a><span class="form-msg" aria-live="polite"></span></div>
        </form>`;
      v.querySelectorAll('.p-vid').forEach((card) => {
        const slot = card.dataset.slot, msg = card.querySelector('.form-msg');
        card.querySelector('.p-vid-link').addEventListener('submit', async (e) => {
          e.preventDefault(); flash(msg, 'Checking the link…');
          const o = await api('/portal/settings', { method: 'PUT', body: { [slot]: e.target.link.value } });
          flash(msg, o.message, o.ok); if (o.ok) setTimeout(route, 900);
        });
        card.querySelector('input[type=file]').addEventListener('change', async (e) => {
          const file = e.target.files[0]; if (!file) return;
          if (file.size > 200 * 1024 * 1024) { flash(msg, 'That file is over 200 MB. Please use a shorter or smaller video.', false); return; }
          const bar = card.querySelector('.p-progress'); bar.hidden = false; flash(msg, 'Uploading…');
          const o = await sendFile(`/portal/settings/video?slot=${slot}`, file, (p) => { bar.firstElementChild.style.width = Math.round(p * 100) + '%'; msg.textContent = `Uploading… ${Math.round(p * 100)}%`; });
          bar.hidden = true; flash(msg, o.message, o.ok); if (o.ok) setTimeout(route, 900);
        });
        const clear = card.querySelector('[data-clear]');
        if (clear) clear.addEventListener('click', async () => { if (!confirm('Remove this video from the website?')) return; const o = await api('/portal/settings', { method: 'PUT', body: { [slot]: '' } }); flash(msg, o.message, o.ok); if (o.ok) route(); });
      });
      $('#vs').addEventListener('input', (e) => { $('#vsOut').textContent = e.target.value + '%'; });
      $('#sf').addEventListener('submit', async (e) => {
        e.preventDefault(); const f = e.target;
        const o = await api('/portal/settings', { method: 'PUT', body: { video_strength: f.video_strength.value, announce_on: f.announce_on.checked, announce_text: f.announce_text.value, announce_link: f.announce_link.value } });
        flash($('#sf .form-msg'), o.message, o.ok);
      });
    },
    async account(v) {
      v.innerHTML = `<section class="p-card p-narrow p-me"><h2>Profile picture</h2>
          <div class="p-me-row">${ava(me, 'p-ava-lg', 'meAva')}<div><label class="btn btn-dark btn-sm p-file">Choose a picture<input type="file" id="avaFile" accept="image/*" hidden/></label>${me.avatar ? ' <button type="button" class="linkish" id="avaDel">Remove</button>' : ''}<p class="fine">A clear photo of your face works best. It's cropped to a square.</p><p class="form-msg" id="avaMsg" aria-live="polite"></p></div></div>
          <p><b>${h(me.name)}</b><br/>${h(me.email)}<br/>${h(ROLE[me.role])}</p></section>
        <form class="p-card p-narrow" id="pf"><h2>Change your password</h2><div class="field"><label for="pc">Current password</label><input id="pc" name="current" type="password" required autocomplete="current-password"/></div><div class="field"><label for="pn">New password <small>(10+ characters)</small></label><input id="pn" name="next" type="password" required minlength="10" autocomplete="new-password"/></div><div class="p-row"><button class="btn btn-dark btn-sm">Update password</button></div><p class="form-msg" aria-live="polite"></p></form>`;
      $('#pf').addEventListener('submit', async (e) => { e.preventDefault(); const o = await api('/portal/password', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) }); flash($('#pf .form-msg'), o.message, o.ok); if (o.ok) e.target.reset(); });
      const setMine = (avatar) => { me.avatar = avatar; $('#pAva').outerHTML = ava(me, 'p-ava', 'pAva'); route(); };
      $('#avaFile').addEventListener('change', async (e) => {
        const file = e.target.files[0]; if (!file) return;
        const msg = $('#avaMsg'); flash(msg, 'Uploading…');
        try {
          const o = await sendFile('/portal/me/avatar', await squareJpeg(file));
          flash(msg, o.message, o.ok); if (o.ok) setMine(o.avatar);
        } catch (err) { flash(msg, err.message, false); }
      });
      const del = $('#avaDel'); if (del) del.addEventListener('click', async () => { const o = await api('/portal/me/avatar', { method: 'DELETE' }); if (o.ok) setMine(''); });
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
    v.innerHTML = `<section class="p-card"><h2>${h(out.data[0].subject)}</h2>${out.data.map((m) => `<article class="p-thread-msg${m.from_id === me.id ? ' mine' : ''}"><header>${ava(m, 'p-ava-xs')}<b>${h(m.from_name)}</b> to ${h(m.to_name)}<time>${h(when(m.created_at))}</time></header><p class="p-pre">${h(m.body)}</p></article>`).join('')}<div class="p-row"><button type="button" class="btn btn-dark btn-sm" id="reply">Reply</button></div></section>`;
    $('#reply').addEventListener('click', () => compose(v, { to: other, subject: out.data[0].subject.startsWith('Re: ') ? out.data[0].subject : 'Re: ' + out.data[0].subject, thread: out.thread_id }));
    refreshUnread();
  }

  boot();
})();
