// ============================================================
//  INDIVIDUAL KEYNOTE PAGE — one per talk (blueprint §9)
//  Title, abstract, who it's for, outcomes, format & length,
//  sample clip slot, testimonials, FAQ, related talks, Book This Talk
// ============================================================
const site = require('../content/site');
const { talks } = require('../content/talks');
const { testimonials } = require('../content/proof');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock, sampleTag } = require('../lib/layout');
const { talkCard, ctaBand } = require('../lib/partials');

module.exports = (slug) => {
  const t = talks.find((x) => x.slug === slug);
  const depth = 2, r = rel(depth);
  const path = `speaking/${t.slug}/`;
  const bc = crumbs([['Speaking', 'speaking/'], [t.title, path]], depth);
  const related = talks.filter((x) => x.slug !== slug);
  const quote = testimonials.find((q) => !q.sample) || testimonials[0];
  const faq = faqBlock([
    [`How long is "${t.title}"?`, `It runs ${t.length} and can be shaped to fit your agenda.`],
    ['Which formats are available?', `${t.formats.join(', ')}. Every version is tailored after a short planning call.`],
    ['Who is this talk best for?', t.who],
    ['Can attendees get a takeaway resource?', 'Yes. Attendees can receive a companion worksheet so the ideas turn into action after the event.'],
  ]);

  const body = `
${pageHero({
    mark: `0${talks.indexOf(t) + 1}`,
    eyebrow: `${esc(t.kind)} · ${esc(t.length)}`,
    title: `${esc(t.title)}`,
    lead: esc(t.subtitle),
    crumbsHtml: bc.html,
    extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="${r}book/?talk=${t.slug}">Book this talk ${icon('arrow')}</a><a class="btn btn-ghost magnetic" href="${r}press/#one-sheet">Download one-sheet</a></div>`,
  })}

<section class="sec" aria-labelledby="absTitle">
  <div class="wrap talk-detail">
    <div class="prose">
      <p class="eyebrow reveal">The talk</p>
      <h2 class="h2 reveal" id="absTitle">What it's about</h2>
      <p class="dropcap reveal">${esc(t.abstract)}</p>
      <h3 class="h3 reveal">Who it's for</h3>
      <p class="reveal">${esc(t.who)}</p>
      <h3 class="h3 reveal">What your audience will leave with</h3>
      <ol class="outcomes reveal">${t.takeaways.map((k) => `<li>${esc(k)}</li>`).join('')}</ol>
    </div>
    <aside class="talk-facts reveal" aria-label="Talk details">
      <dl>
        <div><dt>Format</dt><dd>${t.formats.map(esc).join(' · ')}</dd></div>
        <div><dt>Length</dt><dd>${esc(t.length)}</dd></div>
        <div><dt>Audiences</dt><dd>${t.audiences.map(esc).join(' · ')}</dd></div>
        <div><dt>Delivery</dt><dd>In person (Bay Area and travel) or virtual</dd></div>
      </dl>
      <a class="btn btn-gold btn-block magnetic" href="${r}book/?talk=${t.slug}">Book this talk ${icon('arrow')}</a>
      <button type="button" class="btn btn-ghost-dark btn-block js-agent-open">Ask Agent Yo about it</button>
    </aside>
  </div>
</section>

<section class="sec dark grain" aria-labelledby="clipTitle">
  <div class="wrap clip-in">
    <div class="reel reveal" data-video="${r}assets/video/${t.slug}.mp4">
      <img src="${r}images/yolanda.jpg" alt="" width="720" height="720" loading="lazy"/>
      <span class="reel-badge">${icon('play')} Sample clip coming soon</span>
    </div>
    <div>
      <p class="eyebrow eyebrow-gold reveal">From similar events</p>
      <h2 class="h2 reveal" id="clipTitle">What planners <em>hear afterwards.</em></h2>
      <blockquote class="side-quote reveal">"${esc(quote.quote)}"<cite>${esc(quote.name)} · ${esc(quote.role)} ${sampleTag(quote)}</cite></blockquote>
    </div>
  </div>
</section>

${faq.html}

<section class="sec blush" aria-labelledby="relTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Related talks</p><h2 class="h2 reveal" id="relTitle">Pair it <em>with another.</em></h2></div>
    <div class="talk-grid two">${related.map((x) => talkCard(x, talks.indexOf(x), r)).join('')}</div>
  </div>
</section>

${ctaBand(r, { title: `Book <em>${esc(t.title)}.</em>`, lead: 'Tell us your date, audience and goals. The booking form is already set to this talk.', primary: ['Book this talk', `book/?talk=${t.slug}`] })}
`;

  return page({
    path, depth, active: 'speaking/',
    title: `${t.title} | Keynote by Yolanda Butler`.slice(0, 60),
    description: `${t.subtitle}. A ${t.length.toLowerCase()} ${t.kind.toLowerCase()} by Yolanda "Yo" Butler for ${t.audiences.slice(0, 2).join(' and ').toLowerCase()} audiences.`.slice(0, 155),
    body,
    schema: [
      { '@type': 'Service', '@id': abs(path + '#service'), name: t.title, description: t.abstract, serviceType: `${t.kind} speaking`, provider: { '@id': ids.person }, areaServed: site.person.area, audience: t.audiences.map((a) => ({ '@type': 'Audience', audienceType: a })), url: abs(path) },
      bc.schema, faq.schema,
    ],
  });
};
