/* ============================================================
   Yo | The Business of You — site interactions
   Reveal, parallax, magnetic buttons, hero reel, quiz,
   carousel, forms, cookie consent and Agent Yo (guided mode).
============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const ROOT = document.body.dataset.root || './';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const store = {
    get: (k, s = localStorage) => { try { return s.getItem(k); } catch { return null; } },
    set: (k, v, s = localStorage) => { try { s.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const escHTML = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const postJSON = async (url, data) => {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const out = await res.json().catch(() => ({ ok: false }));
    if (!res.ok && out.ok === undefined) throw new Error('bad response');
    return out;
  };
  const OFFLINE = 'Thank you! Online forms switch on when the site moves to its live server. For now, please email ' + 'hello@yourdomain.com' + '.';

  /* ---------- Header: solid after scrolling (home overlays the hero) ---------- */
  const hdr = $('#hdr');
  const onScroll = () => hdr && hdr.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger'), mnav = $('#mnav');
  if (burger && mnav) {
    const set = (open) => { mnav.hidden = !open; burger.setAttribute('aria-expanded', String(open)); document.body.style.overflow = open ? 'hidden' : ''; };
    burger.addEventListener('click', () => set(mnav.hidden));
    mnav.addEventListener('click', (e) => { if (e.target.closest('a')) set(false); });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !mnav.hidden) set(false); });
  }

  /* ---------- Fade-and-rise on scroll ---------- */
  const reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } }), { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach((el) => io.observe(el));
  } else reveals.forEach((el) => el.classList.add('in'));

  /* ---------- Subtle parallax ---------- */
  const para = $$('.parallax');
  if (para.length && !reduceMotion) {
    let ticking = false;
    const run = () => { para.forEach((el) => { const r = el.getBoundingClientRect(); const off = (r.top + r.height / 2 - innerHeight / 2) * Number(el.dataset.speed || 0.05); el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`; }); ticking = false; };
    addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(run); } }, { passive: true });
    run();
  }

  /* ---------- Magnetic buttons ---------- */
  if (finePointer && !reduceMotion) {
    $$('.magnetic').forEach((b) => {
      b.addEventListener('pointermove', (e) => { const r = b.getBoundingClientRect(); const x = (e.clientX - r.left - r.width / 2) * 0.18; const y = (e.clientY - r.top - r.height / 2) * 0.28; b.style.transform = `translate(${x}px, ${y}px)`; });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- Hero sizzle reel: only if the video file exists ---------- */
  const media = $('.hero-media[data-reel]');
  if (media && !reduceMotion) {
    const src = ROOT + media.dataset.reel;
    fetch(src, { method: 'HEAD' }).then((r) => {
      if (!r.ok || !(r.headers.get('content-type') || '').startsWith('video')) return;
      const v = document.createElement('video');
      Object.assign(v, { src, muted: true, loop: true, autoplay: true, playsInline: true, poster: ROOT + 'images/yolanda.jpg' });
      v.setAttribute('aria-hidden', 'true');
      v.addEventListener('canplay', () => v.classList.add('ready'), { once: true });
      media.prepend(v); v.play().catch(() => {});
      const t = $('#soundToggle');
      if (t) {
        t.hidden = false;
        t.addEventListener('click', () => { v.muted = !v.muted; t.setAttribute('aria-pressed', String(!v.muted)); t.querySelector('span').textContent = v.muted ? 'Sound off' : 'Sound on'; t.querySelector('use').setAttribute('href', v.muted ? '#i-mute' : '#i-sound'); });
      }
    }).catch(() => {});
  }

  /* ---------- Toast ---------- */
  let toastEl;
  const toast = (msg) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('show'); clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('show'), 3600);
  };

  /* ---------- Find your talk quiz ---------- */
  const TALKS = {
    'business-of-you': { title: 'The Business of You', sub: 'Build a business around your strengths, story and season of life.' },
    'credit-capital-confidence': { title: 'Credit, Capital & Confidence', sub: 'Financial wellness for founders who are ready to grow.' },
    'each-one-reach-one': { title: 'Each One, Reach One', sub: 'The power of social capital in business and community.' },
  };
  const quiz = $('#quizForm');
  if (quiz) {
    const steps = $$('fieldset', quiz), dots = $$('.quiz-dots i', quiz), back = $('#quizBack'), result = $('#quizResult');
    let at = 0;
    const show = (i) => {
      at = i; steps.forEach((s, n) => { s.hidden = n !== i; }); result.hidden = true;
      dots.forEach((d, n) => d.classList.toggle('on', n <= i)); back.hidden = i === 0;
    };
    quiz.addEventListener('change', () => {
      if (at < steps.length - 1) { setTimeout(() => show(at + 1), 260); return; }
      const data = Object.fromEntries(new FormData(quiz));
      const t = TALKS[data.goal] || TALKS['business-of-you'];
      const fmt = data.fmt === 'Workshop' ? 'as a hands-on workshop' : data.fmt === 'Panel' ? 'as a panel or fireside chat' : data.fmt === 'Virtual' ? 'virtually' : 'as a keynote';
      setTimeout(() => {
        steps.forEach((s) => { s.hidden = true; });
        result.innerHTML = `<p class="rk">Your best fit</p><h4>${escHTML(t.title)}</h4><p>${escHTML(t.sub)} Delivered ${fmt} for your ${escHTML((data.aud || 'audience').toLowerCase())} audience.</p>
          <div class="hero-ctas"><a class="btn btn-gold btn-sm" href="${ROOT}book/?talk=${encodeURIComponent(data.goal)}&format=${encodeURIComponent(data.fmt || '')}">Book this talk</a><a class="btn btn-ghost btn-sm" href="${ROOT}speaking/${data.goal}/">See the talk</a></div>`;
        result.hidden = false; dots.forEach((d) => d.classList.add('on')); back.hidden = false; back.textContent = 'Start over';
        back.onclick = () => { quiz.reset(); back.textContent = 'Back'; back.onclick = null; show(0); };
      }, 260);
    });
    back.addEventListener('click', () => { if (back.textContent === 'Back') show(Math.max(0, at - 1)); });
    show(0);
  }

  /* ---------- Testimonial carousel ---------- */
  const car = $('#testi');
  if (car) {
    const slides = $$('.car-slide', car), dots = $$('.car-dots button', car);
    let i = 0, timer;
    const go = (n) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => { s.classList.toggle('on', k === i); s.setAttribute('aria-hidden', String(k !== i)); });
      dots.forEach((d, k) => (k === i ? d.setAttribute('aria-current', 'true') : d.removeAttribute('aria-current')));
    };
    const auto = () => { if (reduceMotion) return; clearInterval(timer); timer = setInterval(() => go(i + 1), 7000); };
    $$('.car-btn', car).forEach((b) => b.addEventListener('click', () => { go(i + Number(b.dataset.dir)); auto(); }));
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); auto(); }));
    car.addEventListener('mouseenter', () => clearInterval(timer));
    car.addEventListener('mouseleave', auto);
    car.addEventListener('focusin', () => clearInterval(timer));
    auto();
  }

  /* ---------- Forms ---------- */
  const msgFor = (form) => form.querySelector('.form-msg') || (form.nextElementSibling && form.nextElementSibling.classList.contains('form-msg') ? form.nextElementSibling : null);
  const say = (el, text, ok) => { if (!el) return; el.textContent = text; el.classList.toggle('ok', !!ok); el.classList.toggle('err', ok === false); };

  $$('.js-sub').forEach((form) => form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = msgFor(form), email = form.email.value.trim();
    say(msg, 'Adding you…');
    try {
      const out = await postJSON('/api/subscribers', { email, source: form.dataset.source || 'website' });
      const THANKS = {
        workbook: "You're on the list! We'll email your workbook the moment it's released.",
        'show-waitlist': "You're on the waitlist! We'll email launch dates and taping invitations.",
        'community-waitlist': "You're on the community waitlist! We'll email you when doors open.",
        'cohort-waitlist': "You're on the cohort waitlist! We'll email you before enrollment opens.",
        resource: "Thank you! Your download is ready below.",
      };
      say(msg, out.ok ? (form.dataset.success || THANKS[form.dataset.source] || "You're on the list. See you Sunday.") : out.message, !!out.ok);
      if (out.ok) { form.reset(); track('subscribe_' + (form.dataset.source || 'website')); }
    } catch { say(msg, OFFLINE); }
  }));

  const quick = $('#quickBook');
  if (quick) quick.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = msgFor(quick);
    if (!quick.checkValidity()) { quick.reportValidity(); return; }
    const data = Object.fromEntries(new FormData(quick));
    if (data.website) return; // honeypot: bots fill hidden fields
    say(msg, 'Sending…');
    try {
      const out = await postJSON('/api/inquiries', { ...data, inquiry_type: 'Booking (homepage)', consent: undefined, website: undefined });
      say(msg, out.ok ? "Thank you! Yo's team will reply within one business day." : out.message, !!out.ok);
      if (out.ok) { quick.reset(); track('booking_inquiry'); }
    } catch { say(msg, OFFLINE); }
  });

  /* ---------- Cookie consent + privacy-friendly analytics ---------- */
  const cookie = $('#cookie');
  const consent = () => store.get('yoConsent');
  function track(event) { if (consent() !== 'yes') return; postJSON('/api/track', { page: location.pathname + (event ? '#' + event : '') }).catch(() => {}); }
  if (cookie) {
    if (!consent()) setTimeout(() => { cookie.hidden = false; }, 1200);
    $$('[data-consent]', cookie).forEach((b) => b.addEventListener('click', () => { store.set('yoConsent', b.dataset.consent); cookie.hidden = true; if (b.dataset.consent === 'yes') track(); }));
    $$('.js-cookie-prefs').forEach((b) => b.addEventListener('click', () => { cookie.hidden = false; }));
  }
  track();

  /* ---------- Talk filters (Speaking hub) ---------- */
  const filters = $('#talkFilters');
  if (filters) {
    const sel = { aud: '', fmt: '' };
    const cards = $$('.filterable .talk'), count = $('#filterCount'), empty = $('#filterEmpty');
    const apply = () => {
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!sel.aud || c.dataset.aud.split('|').includes(sel.aud)) && (!sel.fmt || c.dataset.fmt.split('|').includes(sel.fmt));
        c.classList.toggle('is-hidden', !ok); if (ok) { shown++; c.classList.add('in'); }
      });
      count.textContent = `Showing ${shown} of ${cards.length} talks`;
      empty.hidden = shown > 0;
    };
    filters.addEventListener('click', (e) => {
      const b = e.target.closest('.chip'); if (!b) return;
      sel[b.dataset.filter] = b.dataset.value;
      $$(`.chip[data-filter="${b.dataset.filter}"]`, filters).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
    apply();
  }

  /* ---------- Accessible tabs (bios, corporate/nonprofit) ---------- */
  $$('[role="tablist"]').forEach((list) => {
    const tabs = $$('[role="tab"]', list);
    const select = (t) => {
      tabs.forEach((x) => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; const p = document.getElementById(x.getAttribute('aria-controls')); if (p) p.hidden = !on; });
      t.focus();
    };
    tabs.forEach((t, i) => {
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); select(tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length]); }
      });
    });
  });

  /* ---------- Bio copy / download ---------- */
  const bioBox = $('[data-bios]');
  if (bioBox) {
    const current = () => $('.bio-panel:not([hidden])', bioBox);
    const msg = $('.form-msg', bioBox);
    $('.js-copy-bio', bioBox).addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(current().innerText.trim()); say(msg, 'Bio copied.', true); }
      catch { say(msg, 'Select the text and copy it manually.', false); }
    });
    $('.js-dl-bio', bioBox).addEventListener('click', () => {
      const len = current().id.replace('bio-', '');
      const blob = new Blob([current().innerText.trim() + '\n'], { type: 'text/plain' });
      const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `yolanda-butler-bio-${len}.txt` });
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    });
  }

  /* ---------- Package buttons pre-select the proposal form ---------- */
  $$('[data-package]').forEach((b) => b.addEventListener('click', () => { const s = $('#pPkg'); if (s) s.value = b.dataset.package; }));

  /* ---------- Generic inquiry forms (.js-form) → /api/inquiries ----------
     Known columns go straight in; any other field is added to the message. */
  const COLUMNS = ['name', 'email', 'phone', 'organization', 'inquiry_type', 'event_type', 'event_date', 'budget', 'message'];
  $$('.js-form').forEach((f) => f.addEventListener('submit', async (e) => {
    e.preventDefault();
    const msg = msgFor(f);
    if (!f.checkValidity()) { f.reportValidity(); return; }
    const raw = Object.fromEntries(new FormData(f));
    if (raw.website) return; // honeypot
    const data = { inquiry_type: f.dataset.type || 'General' };
    const extra = [];
    Object.entries(raw).forEach(([k, v]) => {
      if (k === 'website' || k === 'consent' || v === '') return;
      if (COLUMNS.includes(k)) data[k] = v;
      else { const label = (f.querySelector(`[name="${k}"]`)?.closest('.field')?.querySelector('label')?.textContent || k).trim(); extra.push(`${label}: ${v}`); }
    });
    data.message = [data.message, ...extra].filter(Boolean).join('\n') || '(no message)';
    say(msg, 'Sending…');
    try {
      const out = await postJSON('/api/inquiries', data);
      say(msg, out.ok ? (f.dataset.success || 'Thank you! We\'ll be in touch soon.') : out.message, !!out.ok);
      if (out.ok) { f.reset(); track('form_' + (f.dataset.type || 'general').toLowerCase().replace(/\W+/g, '_')); }
    } catch { say(msg, OFFLINE); }
  }));


  /* ---------- Copy blocks (emcee script) and print buttons ---------- */
  $$('[data-copy]').forEach((box) => {
    const btn = $('.js-copy', box), msg = $('.form-msg', box), text = $('.emcee-text', box) || box;
    if (btn) btn.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(text.innerText.trim()); say(msg, 'Copied.', true); }
      catch { say(msg, 'Select the text and copy it manually.', false); }
    });
  });
  $$('.js-print').forEach((b) => b.addEventListener('click', () => window.print()));

  /* ---------- Video slots: play only when the file exists ---------- */
  $$('.reel[data-video]').forEach((box) => {
    const src = box.dataset.video;
    fetch(src, { method: 'HEAD' }).then((r) => {
      if (!r.ok || !(r.headers.get('content-type') || '').startsWith('video')) return;
      const v = Object.assign(document.createElement('video'), { src, controls: true, preload: 'metadata', playsInline: true });
      box.innerHTML = ''; box.appendChild(v);
    }).catch(() => {});
  });

  /* ============================================================
     AGENT YO — guided concierge (works offline).
     Step 4 connects free-text questions to the AI backend.
  ============================================================ */
  const panel = $('#agentPanel'), log = $('#agentLog'), form = $('#agentForm'), input = $('#agentText'), bubble = $('#agentBubble');
  if (!panel) return;

  const CRISIS = /\b(suicid|kill myself|end my life|self[- ]?harm|hurt myself|want to die|no reason to live)\b/i;
  const FEES = /\b(fee|fees|price|pricing|cost|how much|rate|charge)\b/i;
  const ADVICE = /\b(tax|lawsuit|legal|invest|stock|bankrupt|depress|anxiety|therapy|diagnos)\b/i;
  const state = { mode: null, step: 0, data: {}, started: false, locked: false };

  const add = (html, who = 'bot', cls = '') => { const d = document.createElement('div'); d.className = `msg ${who} ${cls}`.trim(); d.innerHTML = html; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
  const options = (list) => {
    const wrap = document.createElement('div'); wrap.className = 'opts';
    list.forEach((o) => {
      const el = document.createElement(o.href ? 'a' : 'button');
      if (o.href) el.href = o.href; else el.type = 'button';
      el.textContent = o.label;
      if (!o.href) el.addEventListener('click', () => { wrap.remove(); add(escHTML(o.label), 'me'); o.run ? o.run() : answer(o.value ?? o.label); });
      wrap.appendChild(el);
    });
    log.appendChild(wrap); log.scrollTop = log.scrollHeight;
  };
  const botSay = (html, opts, delay = 550) => new Promise((res) => {
    const t = add('<span class="typing"><i></i><i></i><i></i></span>');
    setTimeout(() => { t.innerHTML = html; if (opts) options(opts); log.scrollTop = log.scrollHeight; res(); }, reduceMotion ? 0 : delay);
  });


  /* ---------- Agent Yo AI (server) — falls back to the guided flows when offline ---------- */
  const AI = { offline: false, session: store.get('yoAgentSession', sessionStorage) || '' };
  // Safe formatting for AI replies: escape, then add links, bold and paragraphs
  const formatReply = (text) => escHTML(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(https?:\/\/[^\s<)]+[^\s<).,!?])/g, (u) => {
      const internal = u.startsWith(location.origin);
      return `<a href="${u}"${internal ? '' : ' target="_blank" rel="noopener"'}>${internal ? u.replace(location.origin, '') || '/' : u}</a>`;
    })
    .split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
  const saveLog = () => {
    const items = $$('.msg', log).slice(-40).map((m) => ({ c: m.className, h: m.innerHTML }));
    store.set('yoAgentLog', JSON.stringify(items), sessionStorage);
  };
  async function askAI(text) {
    if (AI.offline) return false;
    const t = add('<span class="typing"><i></i><i></i><i></i></span>');
    try {
      const res = await fetch('/api/agent/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: AI.session, message: text, page: location.pathname }) });
      const out = await res.json().catch(() => null);
      if (!out || out.offline) { AI.offline = true; t.remove(); if (out && out.session_id) { AI.session = out.session_id; store.set('yoAgentSession', AI.session, sessionStorage); } return false; }
      if (out.session_id) { AI.session = out.session_id; store.set('yoAgentSession', AI.session, sessionStorage); }
      t.innerHTML = out.ok ? formatReply(out.reply) : `<p>${escHTML(out.message || 'Something went wrong.')}</p>`;
      if (out.crisis) state.locked = true;
      log.scrollTop = log.scrollHeight; saveLog();
      track('agent_ai_reply');
      return true;
    } catch {
      AI.offline = true; t.remove(); return false;
    }
  }
  $$('.js-agent-forget').forEach((b) => b.addEventListener('click', async () => {
    if (AI.session) { try { await fetch('/api/agent/forget', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: AI.session }) }); } catch { /* offline: nothing stored */ } }
    AI.session = ''; store.set('yoAgentSession', '', sessionStorage); store.set('yoAgentLog', '[]', sessionStorage);
    log.innerHTML = ''; state.started = false; state.locked = false; state.mode = null;
    add('<p>Done. This conversation has been deleted.</p>', 'bot', 'notice'); start();
  }));

  const openAgent = (mode) => {
    panel.hidden = false; bubble.hidden = true; store.set('yoBubble', '1', sessionStorage);
    if (!state.started) start();
    if (mode) setTimeout(() => chooseMode(mode), 450);
    setTimeout(() => input.focus(), 80);
    track('agent_open');
  };
  const dock = $('[data-agent-dock]');
  const closeAgent = () => { if (!dock) panel.hidden = true; };
  // Agent Yo page: dock the chat into the page, always open
  if (dock) {
    dock.appendChild(panel); panel.classList.add('docked'); panel.hidden = false;
    $('.agent-fab').hidden = true; if (bubble) bubble.remove();
    $$('.js-agent-close', panel).forEach((b) => { b.hidden = true; });
  }
  $$('.js-agent-open').forEach((b) => b.addEventListener('click', () => (panel.hidden ? openAgent() : closeAgent())));
  $$('.js-agent-close').forEach((b) => b.addEventListener('click', closeAgent));
  $$('.js-ask').forEach((b) => b.addEventListener('click', () => { openAgent(); setTimeout(() => { add(escHTML(b.textContent), 'me'); saveLog(); chooseMode(b.dataset.mode, b.textContent.trim()); }, 300); }));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !panel.hidden) closeAgent(); });
  if (bubble && !dock) {
    // Greet after a few seconds, but never on top of the cookie notice
    const greet = () => { if (panel.hidden && (!cookie || cookie.hidden) && !store.get('yoBubble', sessionStorage)) bubble.hidden = false; };
    if (!store.get('yoBubble', sessionStorage)) setTimeout(greet, 4500);
    if (cookie) $$('[data-consent]', cookie).forEach((b) => b.addEventListener('click', () => setTimeout(greet, 1500)));
    $('.agent-bubble-x', bubble).addEventListener('click', () => { bubble.hidden = true; store.set('yoBubble', '1', sessionStorage); });
    bubble.addEventListener('click', (e) => { if (!e.target.closest('.agent-bubble-x')) openAgent(); });
  }

  const MODES = [
    { label: "I'm planning an event", value: 'planner' },
    { label: "I'm building a business", value: 'builder' },
    { label: 'Guest, sponsor or press', value: 'partner' },
  ];
  function start() {
    state.started = true;
    let saved = [];
    try { saved = JSON.parse(store.get('yoAgentLog', sessionStorage) || '[]'); } catch { saved = []; }
    if (saved.length && AI.session) {
      saved.forEach((m) => { const d = document.createElement('div'); d.className = m.c; d.innerHTML = m.h; log.appendChild(d); });
      log.scrollTop = log.scrollHeight;
      return;
    }
    add('<p><b>Hi, I\'m Agent Yo</b>, Yolanda\'s AI assistant.</p><p>I can help you find the right talk, test a business idea, or reach the right person. What brings you here today?</p>');
    options(MODES.map((m) => ({ ...m, run: () => chooseMode(m.value, m.label) })));
  }

  // ---- Planner mode (event planners) ----
  const PLAN = [
    { key: 'event_type', q: 'What kind of event are you planning?', opts: ['Conference', 'Corporate event', 'Nonprofit or ministry', "Women's group", 'Workshop or training'] },
    { key: 'event_date', q: 'When is it? A date or month is perfect.', free: 'e.g. March 2027' },
    { key: 'audience', q: 'About how many people will attend?', opts: ['Under 50', '50 to 200', '200 to 500', '500+'] },
    { key: 'goal', q: 'What do you most want your audience to walk away with?', opts: ['A business idea they believe in', 'Money and credit confidence', 'Stronger relationships and community'] },
    { key: 'format', q: 'In person or virtual?', opts: ['In person', 'Virtual', 'Not sure yet'] },
  ];
  // ---- Builder mode (aspiring speakers and entrepreneurs) ----
  const BUILD = [
    { key: 'stage', q: "Let's see if your idea solves a real problem. Where are you today?", opts: ['Just an idea', 'Started, no steady customers', 'Growing, need structure', 'Ready for funding'] },
    { key: 'who', q: 'Can you name the exact person who has this problem?', opts: ['Yes, clearly', 'Sort of', 'Not yet'] },
    { key: 'pay', q: 'Have people already paid you, or asked to, for this solution?', opts: ['Yes', 'They said they would', 'No'] },
  ];

  // With the AI online, a mode button or sample prompt starts an AI conversation.
  function chooseMode(mode, text) {
    if (text && !AI.offline) { saveLog(); askAI(text).then((ok) => { if (!ok) guidedMode(mode, true); }); return; }
    guidedMode(mode, !!text);
  }
  function guidedMode(mode, fromPrompt) {
    state.mode = mode; state.step = 0; state.data = {};
    if (mode === 'partner') {
      return botSay('Wonderful. Which of these fits best?', [
        { label: 'Be a podcast guest', href: ROOT + 'podcast/be-a-guest/' },
        { label: 'Sponsor or partner', href: ROOT + 'podcast/sponsor/' },
        { label: 'Press or media request', href: ROOT + 'press/' },
        { label: 'Something else', run: () => { state.mode = 'free'; botSay('Tell me a little more and I\'ll point you to the right person.'); } },
      ]);
    }
    const intro = mode === 'planner'
      ? (fromPrompt ? 'Happy to help you plan it. ' : 'Great, let\'s find the right talk. ') + 'Five quick questions.'
      : 'Love that. Three quick questions and I\'ll suggest your next step.';
    botSay(intro).then(ask);
  }
  function ask() {
    const flow = state.mode === 'planner' ? PLAN : BUILD;
    const s = flow[state.step];
    if (!s) return state.mode === 'planner' ? finishPlanner() : finishBuilder();
    if (s.opts) botSay(escHTML(s.q), s.opts.map((o) => ({ label: o })), 450);
    else { botSay(escHTML(s.q), null, 450); input.placeholder = s.free || 'Type your answer…'; }
  }
  function answer(value) {
    const flow = state.mode === 'planner' ? PLAN : state.mode === 'builder' ? BUILD : null;
    if (!flow || !flow[state.step]) return freeText(value);
    state.data[flow[state.step].key] = value; state.step += 1; input.placeholder = 'Type a message…'; ask();
  }
  const goalToTalk = (g = '') => /money|credit/i.test(g) ? 'credit-capital-confidence' : /relationship|community/i.test(g) ? 'each-one-reach-one' : 'business-of-you';

  function finishPlanner() {
    const d = state.data, slug = goalToTalk(d.goal), t = TALKS[slug];
    const qs = new URLSearchParams({ talk: slug, event_type: d.event_type || '', event_date: d.event_date || '', audience: d.audience || '', format: d.format || '' });
    state.data.talk = slug;
    botSay(`<p>Here's my recommendation: <b>${escHTML(t.title)}</b>. ${escHTML(t.sub)}</p><p class="fine">Summary: ${escHTML(d.event_type)} · ${escHTML(d.event_date)} · ${escHTML(d.audience)} people · ${escHTML(d.format)}</p><p>Fees depend on the event, so Yo's team shares a quote after a short conversation.</p>`, [
      { label: 'Open the booking form (pre-filled)', href: ROOT + 'book/?' + qs },
      { label: 'See this talk', href: ROOT + 'speaking/' + slug + '/' },
      { label: 'Download the one-sheet', href: ROOT + 'press/#one-sheet' },
    ], 700);
    track('agent_planner_complete');
  }
  function finishBuilder() {
    const d = state.data;
    const strong = d.who === 'Yes, clearly' && d.pay === 'Yes';
    const html = strong
      ? '<p>Your idea has real signals: a clear customer and people willing to pay. Your next step is structure and funding readiness.</p>'
      : '<p>You\'re closer than you think, and the next step is getting sharper on <b>who</b> has the problem and <b>whether they\'ll pay</b> to solve it. That\'s exactly what the free workbook walks you through.</p>';
    botSay(html + '<p class="fine">This is education, not financial or legal advice.</p>', [
      { label: 'Get the free workbook', href: ROOT + '#magEmail' },
      { label: 'Explore training', href: ROOT + 'learn/' },
      { label: 'Join the community waitlist', href: ROOT + 'learn/#community' },
    ], 700);
    track('agent_builder_complete');
  }

  async function freeText(text) {
    // Guardrail 1: crisis redirect — stop everything else
    if (CRISIS.test(text)) {
      state.locked = true;
      return botSay('<p>I\'m really glad you told me. You deserve support right now from a real person.</p><p><b>In the US, call or text 988</b> (Suicide &amp; Crisis Lifeline), or chat at <a href="https://988lifeline.org" target="_blank" rel="noopener">988lifeline.org</a>. If you\'re in immediate danger, call 911.</p><p>I\'m an AI and not able to help with this, but those people can, any time of day.</p>', null, 300);
    }
    if (state.locked) return;
    // Guardrail 2: never invent fees
    if (FEES.test(text)) return botSay('<p>Fees depend on the event type, length, location and audience, so I won\'t guess. Yo\'s team will share a clear quote after a short call.</p>', [{ label: 'Request a quote', href: ROOT + 'book/' }, { label: 'Plan my event with you', run: () => chooseMode('planner') }]);
    // Guardrail 3: education, not advice
    const notice = ADVICE.test(text) ? '<p class="fine">Quick note: I share education, not financial, legal or mental health advice. For your situation, please talk with a licensed professional.</p>' : '';
    // Intent detection from free text
    if (/\b(event|conference|keynote|speak|book|summit|panel|workshop for)\b/i.test(text)) return botSay(notice + 'It sounds like you\'re planning an event. Want me to find the right talk?', [{ label: 'Yes, let\'s plan', run: () => chooseMode('planner') }, { label: 'Just browse talks', href: ROOT + 'speaking/' }]);
    if (/\b(guest|sponsor|press|media|interview|partner)\b/i.test(text)) return chooseMode('partner');
    if (/\b(idea|start|business|credit|fund|loan|grow|customer)\b/i.test(text)) return botSay(notice + 'Let\'s look at your business together.', [{ label: 'Test my idea', run: () => chooseMode('builder') }, { label: 'Free resources', href: ROOT + 'learn/' }]);
    return botSay(notice + '<p>I\'m still learning that one. I can help you plan an event, test a business idea, or reach Yo\'s team.</p>', [...MODES.map((m) => ({ ...m, run: () => chooseMode(m.value) })), { label: 'Contact a person', href: ROOT + 'contact/' }]);
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim(); if (!text) return;
    input.value = ''; add(escHTML(text), 'me');
    $$('.opts', log).forEach((o) => o.remove());
    saveLog();
    const flow = state.mode === 'planner' ? PLAN : state.mode === 'builder' ? BUILD : null;
    if (flow && flow[state.step] && !CRISIS.test(text)) return answer(text); // inside an offline guided flow
    askAI(text).then((ok) => { if (!ok) freeText(text); });
  });

  // Agent Yo page: start the docked chat once everything above is defined
  if (dock) start();
})();
