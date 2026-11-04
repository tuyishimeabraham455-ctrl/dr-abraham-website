/* ============================================================
   Events — upcoming/past + format filters, .ics downloads
============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const list = $('#evList');
  if (!list) return;
  const cards = $$('.event-card', list), count = $('#evCount'), empty = $('#evEmpty');
  const sel = { when: 'upcoming', type: '' };
  const now = Date.now();

  // Upcoming: soonest first. Past: most recent first.
  const apply = () => {
    const shown = cards.filter((c) => {
      const past = Date.parse(c.dataset.end) < now;
      const ok = (sel.when === 'past' ? past : !past) && (!sel.type || c.dataset.type === sel.type);
      c.classList.toggle('is-hidden', !ok); if (ok) c.classList.add('in');
      return ok;
    });
    shown.sort((a, b) => (sel.when === 'past' ? -1 : 1) * (Date.parse(a.dataset.start) - Date.parse(b.dataset.start))).forEach((c) => list.appendChild(c));
    count.textContent = `${shown.length} ${sel.when} event${shown.length === 1 ? '' : 's'}`;
    empty.hidden = shown.length > 0;
  };
  $('#evFilters').addEventListener('click', (e) => {
    const b = e.target.closest('.chip'); if (!b) return;
    const key = 'when' in b.dataset ? 'when' : 'type';
    sel[key] = b.dataset[key];
    $$(`.chip[data-${key}]`).forEach((x) => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); });
    apply();
  });
  apply();

  // Add to calendar: build a standards-compliant .ics file in the browser
  const stamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const icsText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  list.addEventListener('click', (e) => {
    const b = e.target.closest('.js-ics'); if (!b) return;
    const c = b.closest('.event-card');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//The Business of You//Events//EN', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
      `UID:${c.dataset.slug}@thebusinessofyou`, `DTSTAMP:${stamp(new Date().toISOString())}`, `DTSTART:${stamp(c.dataset.start)}`, `DTEND:${stamp(c.dataset.end)}`,
      `SUMMARY:${icsText(c.dataset.title)}`, `DESCRIPTION:${icsText(c.dataset.text + ' ' + location.href)}`, `LOCATION:${icsText(c.dataset.location)}`,
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: `${c.dataset.slug}.ics` });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  });
})();
