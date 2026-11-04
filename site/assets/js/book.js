/* ============================================================
   Book Yo — multi-step form + discovery-call scheduler
============================================================ */
(() => {
  'use strict';
  const form = document.getElementById('bookForm');
  if (!form) return;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const steps = $$('.step', form), dots = $$('.step-dots li', form), bar = $('.step-bar i', form);
  const back = $('#bBack'), next = $('#bNext'), send = $('#bSend'), msg = $('#bMsg');
  const opened = Date.now();
  let at = 0, inquiryId = null;
  const esc = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = (t, ok) => { msg.textContent = t; msg.classList.toggle('ok', ok === true); msg.classList.toggle('err', ok === false); };
  const OFFLINE = 'Online booking switches on when the site moves to its live server. Please email ' + ($('.book-contact a') || {}).textContent + ' for now.';

  /* ---------- Pre-fill from quiz / Agent Yo links ---------- */
  const q = new URLSearchParams(location.search);
  const setVal = (name, v) => {
    if (!v) return;
    const els = $$(`[name="${name}"]`, form);
    if (!els.length) return;
    if (els[0].type === 'radio') { const m = els.find((e) => e.value.toLowerCase() === v.toLowerCase()); if (m) m.checked = true; return; }
    const el = els[0];
    if (el.tagName === 'SELECT') { if ([...el.options].some((o) => o.value === v)) el.value = v; return; }
    el.value = v;
  };
  setVal('topic', q.get('talk'));
  setVal('event_type', q.get('event_type') || (q.get('format') === 'Workshop' ? 'Workshop or training' : ''));
  setVal('audience', q.get('audience'));
  setVal('format', q.get('format'));
  const d = q.get('event_date');
  if (d) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) setVal('event_date', d);
    else { const g = $('#bGoals'); g.value = `Preferred date: ${d}${g.value ? '\n' + g.value : ''}`; }
  }

  /* ---------- Steps ---------- */
  const show = (i) => {
    at = i;
    steps.forEach((s, n) => { s.hidden = n !== i; });
    dots.forEach((dd, n) => { dd.classList.toggle('on', n <= i); dd.classList.toggle('now', n === i); });
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    back.hidden = i === 0; next.hidden = i === steps.length - 1; send.hidden = i !== steps.length - 1;
    say('');
    if (i === steps.length - 1) review();
    const first = steps[i].querySelector('input:not([type=hidden]):not([tabindex="-1"]), select, textarea');
    if (first && i) first.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const valid = (i) => {
    const s = steps[i];
    for (const el of $$('input, select, textarea', s)) {
      if (el.closest('.hp')) continue;
      if (el.type === 'radio') {
        if (el.required && !$$(`[name="${el.name}"]`, s).some((x) => x.checked)) { say('Please choose an option for every question.', false); el.focus(); return false; }
        continue;
      }
      if (!el.checkValidity()) { el.reportValidity(); return false; }
    }
    return true;
  };
  next.addEventListener('click', () => { if (valid(at)) show(at + 1); });
  back.addEventListener('click', () => show(at - 1));
  form.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName === 'INPUT' && at < steps.length - 1) { e.preventDefault(); next.click(); } });

  const LABELS = { event_name: 'Event', event_type: 'Type', event_date: 'Date', format: 'Format', location: 'Location', audience: 'Audience', topic: 'Topic', goals: 'Goals', name: 'Name', email: 'Email', organization: 'Organization', phone: 'Phone', budget: 'Budget', decision_maker: 'Decision maker', heard_from: 'Heard about us' };
  function review() {
    const data = Object.fromEntries(new FormData(form));
    const topicSel = $('#bTopic');
    $('#bReview').innerHTML = Object.entries(LABELS).filter(([k]) => data[k]).map(([k, l]) => {
      const v = k === 'topic' ? topicSel.options[topicSel.selectedIndex].text : data[k];
      return `<div><dt>${esc(l)}</dt><dd>${esc(v)}</dd></div>`;
    }).join('') + '<div class="review-edit"><button type="button" class="linkish" data-goto="0">Edit details</button></div>';
    $('[data-goto]', form).addEventListener('click', () => show(0));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valid(at)) return;
    const data = Object.fromEntries(new FormData(form));
    send.disabled = true; say('Sending…');
    try {
      const res = await fetch('/api/bookings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, consent: true, elapsed: Date.now() - opened, source: q.get('talk') || q.get('event_type') ? 'book-form-prefilled' : 'book-form' }) });
      const out = await res.json();
      if (!out.ok) { say(out.message || 'Something went wrong.', false); send.disabled = false; return; }
      inquiryId = out.id;
      form.hidden = true;
      $('#bDoneName').textContent = data.name.split(' ')[0];
      const done = $('#bDone'); done.hidden = false; done.focus(); done.scrollIntoView({ behavior: 'smooth', block: 'start' });
      loadSlots(data);
    } catch { say(OFFLINE, false); send.disabled = false; }
  });

  /* ---------- Discovery-call scheduler ---------- */
  async function loadSlots(person) {
    const days = $('#schedDays'), times = $('#schedTimes'), tz = $('#schedTz'), book = $('#schedBook'), smsg = $('#schedMsg');
    let chosen = null;
    try {
      const out = await (await fetch('/api/calls/slots')).json();
      if (!out.slots || !out.slots.length) { times.innerHTML = '<p>No open times right now. Yo\'s team will email you to find one.</p>'; book.hidden = true; return; }
      const fmtDay = new Intl.DateTimeFormat('en-US', { timeZone: out.timeZone, weekday: 'short', month: 'short', day: 'numeric' });
      const fmtTime = new Intl.DateTimeFormat('en-US', { timeZone: out.timeZone, hour: 'numeric', minute: '2-digit' });
      const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fmtLocal = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
      tz.textContent = `Times shown in Pacific time (${out.lengthMinutes}-minute video call).` + (local !== out.timeZone ? ' Your local time appears under each option.' : '');
      const byDay = {};
      out.slots.forEach((s) => { const k = fmtDay.format(new Date(s)); (byDay[k] = byDay[k] || []).push(s); });
      const keys = Object.keys(byDay);
      days.innerHTML = keys.map((k, i) => `<button type="button" role="tab" aria-selected="${i === 0}" data-day="${esc(k)}">${esc(k)}</button>`).join('');
      const showDay = (k) => {
        $$('button', days).forEach((b) => b.setAttribute('aria-selected', String(b.dataset.day === k)));
        times.innerHTML = byDay[k].map((s) => `<button type="button" class="slot" data-slot="${s}"><b>${fmtTime.format(new Date(s))}</b>${local !== out.timeZone ? `<small>${fmtLocal.format(new Date(s))}</small>` : ''}</button>`).join('');
        chosen = null; book.disabled = true;
      };
      days.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) showDay(b.dataset.day); });
      times.addEventListener('click', (e) => {
        const b = e.target.closest('.slot'); if (!b) return;
        $$('.slot', times).forEach((x) => x.classList.toggle('on', x === b)); chosen = b.dataset.slot; book.disabled = false;
      });
      showDay(keys[0]);
      book.addEventListener('click', async () => {
        if (!chosen) return;
        book.disabled = true; smsg.textContent = 'Booking…'; smsg.className = 'form-msg';
        const r = await (await fetch('/api/calls', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: person.name, email: person.email, starts_at: chosen, inquiry_id: inquiryId }) })).json();
        if (r.ok) { $('#sched').innerHTML = `<p class="booked-when">Your call is booked for <b>${esc(r.when)}</b>. ${r.emailed ? `A confirmation is on its way to ${esc(person.email)}.` : `Yo's team will email ${esc(person.email)} with the video link.`}</p>`; }
        else { smsg.textContent = r.message; smsg.className = 'form-msg err'; book.disabled = false; }
      });
    } catch { times.innerHTML = '<p>Scheduling is available on the live site.</p>'; book.hidden = true; }
  }

  show(0);
})();
