// ============================================================
//  WORKSHOPS & TRAININGS
// ============================================================
const site = require('../content/site');
const { workshops } = require('../content/talks');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

module.exports = () => {
  const depth = 2, r = rel(depth), path = 'speaking/workshops/';
  const bc = crumbs([['Speaking', 'speaking/'], ['Workshops', path]], depth);
  const faq = faqBlock([
    ['How many people can attend a workshop?', 'Workshops work best for 15 to 80 people so everyone can participate. Larger groups can be split into breakout rooms.'],
    ['Are workshops available virtually?', 'Yes. Each workshop runs in person or live online with interactive exercises.'],
    ['Do participants get materials?', 'Yes. Each participant receives a worksheet or workbook to keep using after the session.'],
  ]);

  const body = `
${pageHero({
    mark: 'W', eyebrow: 'Workshops & trainings', title: 'Hands-on sessions <em>people use on Monday.</em>', lead: 'Practical, interactive trainings on testing ideas, business credit and funding readiness, in person or live online.', crumbsHtml: bc.html })}

<section class="sec" aria-label="Workshops">
  <div class="wrap ws-list">
    ${workshops.map((w, i) => `<article class="ws-row reveal" id="${w.slug}">
      <span class="ws-num">0${i + 1}</span>
      <div class="ws-main">
        <p class="talk-kind">${esc(w.format)}</p>
        <h2 class="h3">${esc(w.title)}</h2>
        <p>${esc(w.text)}</p>
        <p class="fine"><b>Best for:</b> ${esc(w.who)}</p>
      </div>
      <div class="ws-out">
        <p class="eyebrow">Participants will</p>
        <ul class="ticks">${w.outcomes.map((o) => `<li>${icon('check')}${esc(o)}</li>`).join('')}</ul>
        <a class="link-arrow" href="${r}book/?talk=workshop-${w.slug}&format=Workshop">Book this workshop ${icon('arrow')}</a>
      </div>
    </article>`).join('')}
  </div>
</section>

${faq.html}
${ctaBand(r, { title: 'Train your team <em>with Yo.</em>', primary: ['Request a workshop', 'book/?format=Workshop'] })}
`;

  return page({
    path, depth, active: 'speaking/',
    title: 'Business & Credit Workshops | Yolanda Butler',
    description: 'Interactive workshops on testing business ideas, business credit basics and becoming funding-ready, led by Yolanda "Yo" Butler.',
    body,
    schema: [
      ...workshops.map((w) => ({ '@type': 'Service', name: w.title, description: w.text, serviceType: 'Workshop', provider: { '@id': ids.person }, areaServed: site.person.area, url: abs(path + '#' + w.slug) })),
      bc.schema, faq.schema,
    ],
  });
};
