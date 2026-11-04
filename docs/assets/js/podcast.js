/* ============================================================
   Podcast — archive search + topic filter, share link copy
============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  const grid = $('#epGrid');
  if (grid) {
    const cards = $$('.ep-card', grid), search = $('#epSearch'), count = $('#epCount'), empty = $('#epEmpty');
    let topic = '';
    const apply = () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      cards.forEach((c) => {
        const ok = (!topic || c.dataset.topic === topic) && (!q || q.split(/\s+/).every((w) => c.dataset.search.includes(w)));
        c.classList.toggle('is-hidden', !ok); if (ok) { shown++; c.classList.add('in'); }
      });
      count.textContent = `${shown} of ${cards.length} episodes`;
      empty.hidden = shown > 0;
    };
    search.addEventListener('input', apply);
    $('#epFilters').addEventListener('click', (e) => {
      const b = e.target.closest('.chip[data-topic]'); if (!b) return;
      topic = b.dataset.topic;
      $$('.chip[data-topic]').forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
      apply();
    });
    apply();
  }

  $$('.js-share-copy').forEach((b) => b.addEventListener('click', async () => {
    const msg = $('.share-msg');
    try { await navigator.clipboard.writeText(b.dataset.url); msg.textContent = 'Link copied.'; }
    catch { msg.textContent = b.dataset.url; }
  }));
})();
