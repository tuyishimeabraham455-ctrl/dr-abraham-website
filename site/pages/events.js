// ============================================================
//  EVENTS CALENDAR — upcoming & past, filterable,
//  add-to-calendar (.ics + Google), register, invite Yo
// ============================================================
const { events } = require('../content/events');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, sampleTag } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const TZ = 'America/Los_Angeles';
const fmt = (iso, opts) => new Intl.DateTimeFormat('en-US', { timeZone: TZ, ...opts }).format(new Date(iso));
const gcalStamp = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'events/';
  const bc = crumbs([['Events', path]], depth);
  const card = (e) => {
    const gcal = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(e.title)}&dates=${gcalStamp(e.start)}/${gcalStamp(e.end)}&details=${encodeURIComponent(e.text)}&location=${encodeURIComponent(e.location)}`;
    return `<article class="event-card reveal" data-start="${esc(e.start)}" data-end="${esc(e.end)}" data-type="${esc(e.type)}" data-title="${esc(e.title)}" data-location="${esc(e.location)}" data-text="${esc(e.text)}" data-slug="${esc(e.slug)}">
      <div class="event-date"><b>${fmt(e.start, { day: 'numeric' })}</b><span>${fmt(e.start, { month: 'short' })}</span><small>${fmt(e.start, { year: 'numeric' })}</small></div>
      <div class="event-body">
        <p class="talk-kind">${esc(e.type)} · ${fmt(e.start, { hour: 'numeric', minute: '2-digit' })} to ${fmt(e.end, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })} ${sampleTag(e)}</p>
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.text)}</p>
        <p class="event-loc">${icon('pin')} ${esc(e.location)}</p>
      </div>
      <div class="event-actions">
        ${e.link ? `<a class="btn btn-gold btn-sm" href="${esc(e.link)}" target="_blank" rel="noopener">Register</a>` : `<a class="btn btn-gold btn-sm" href="${r}contact/">Ask about tickets</a>`}
        <button type="button" class="btn btn-ghost-dark btn-sm js-ics">${icon('cal')} Add to calendar</button>
        <a class="cal-link" href="${gcal}" target="_blank" rel="noopener">Google Calendar</a>
      </div>
    </article>`;
  };

  const body = `
${pageHero({ mark: 'Cal', eyebrow: 'Events', title: 'Where to see <em>Yo next.</em>', lead: 'Keynotes, workshops and live experiences, in person and online.', crumbsHtml: bc.html })}
<section class="sec" aria-label="Events calendar">
  <div class="wrap">
    <div class="filter-bar reveal" id="evFilters">
      <div class="filter-group" role="group" aria-label="When"><span>When</span><button type="button" class="chip on" data-when="upcoming">Upcoming</button><button type="button" class="chip" data-when="past">Past</button></div>
      <div class="filter-group" role="group" aria-label="Format"><span>Format</span><button type="button" class="chip on" data-type="">All</button><button type="button" class="chip" data-type="In person">In person</button><button type="button" class="chip" data-type="Virtual">Virtual</button></div>
    </div>
    <p class="filter-count" id="evCount" aria-live="polite"></p>
    <div class="event-list" id="evList">${events.map(card).join('')}</div>
    <p class="filter-empty" id="evEmpty" hidden>Nothing here yet. New dates are announced to the Sunday Letter first.</p>
  </div>
</section>
<section class="sec blush" aria-labelledby="inviteTitle">
  <div class="wrap cn-teaser">
    <div><p class="eyebrow reveal">Invite Yo</p><h2 class="h2 reveal" id="inviteTitle">Want Yo <em>at your event?</em></h2><p class="reveal">Conferences, companies, nonprofits and ministries: tell us about your date and audience.</p></div>
    <a class="btn btn-dark magnetic reveal" href="${r}book/">Invite Yo to your event ${icon('arrow')}</a>
  </div>
</section>
${ctaBand(r, { title: 'Never miss <em>a date.</em>', lead: 'New events are announced in the Sunday Letter first.', primary: ['Book Yo', 'book/'], secondary: ['Ask Agent Yo', null] })}`;

  // Schema only for real (non-sample) events
  const real = events.filter((e) => !e.sample).map((e) => ({
    '@type': 'Event', name: e.title, description: e.text, startDate: e.start, endDate: e.end,
    eventAttendanceMode: e.type === 'Virtual' ? 'https://schema.org/OnlineEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode',
    location: e.type === 'Virtual' ? { '@type': 'VirtualLocation', url: e.link || abs(path) } : { '@type': 'Place', name: e.location, address: e.location },
    organizer: { '@type': 'Organization', name: e.organizer }, performer: { '@id': ids.person }, url: e.link || abs(path),
  }));

  return page({ path, depth, active: '', title: 'Events | See Yolanda "Yo" Butler Live', description: 'Upcoming keynotes, workshops and live events with Yolanda "Yo" Butler, in person and online. Add dates to your calendar or invite Yo to your event.', body, scripts: ['assets/js/events.js'], schema: [...real, bc.schema] });
};
