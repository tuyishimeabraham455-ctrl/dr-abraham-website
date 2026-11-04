// ============================================================
//  SPEAKING HUB — filterable talks, quiz, workshops, reel
// ============================================================
const site = require('../content/site');
const { talks, workshops, eventTypes } = require('../content/talks');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');
const { quiz, talkCard, ctaBand } = require('../lib/partials');

const AUDIENCES = ['Corporate', 'Nonprofit', 'Conference', "Women's groups"];
const FORMATS = ['Keynote', 'Workshop', 'Panel', 'Fireside chat', 'Virtual'];

module.exports = () => {
  const depth = 1, r = rel(depth);
  const bc = crumbs([['Speaking', 'speaking/']], depth);
  const faq = faqBlock([
    ['What topics does Yolanda speak on?', 'Building a business around your strengths, business credit and funding readiness, financial and mental wellness for founders, and the power of social capital and community.'],
    ['Does she speak virtually?', 'Yes. Every keynote and workshop can be delivered virtually, and she speaks in person across the San Francisco Bay Area and beyond.'],
    ['How far ahead should we book?', 'Most events book two to four months ahead. If your date is sooner, ask anyway; Yo\'s team will tell you quickly if it can work.'],
    ['Can a talk be customized for our audience?', 'Yes. Every talk is tailored after a short planning call about your audience, goals and format.'],
    ['How are fees set?', 'Fees depend on the event type, length, location and audience. Yo\'s team shares a clear quote after a short conversation.'],
  ]);

  const tagAttrs = (aud, fmt) => `data-aud="${esc(aud.join('|'))}" data-fmt="${esc(fmt.join('|'))}"`;

  const body = `
${pageHero({
    mark: 'Speak',
    eyebrow: 'Speaking',
    title: 'Talks that leave rooms <em>ready to build.</em>',
    lead: 'Keynotes, workshops, panels and fireside chats on building a business around you, financial wellness and the power of community.',
    crumbsHtml: bc.html,
    extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="${r}book/">Book Yo ${icon('arrow')}</a><a class="btn btn-ghost magnetic" href="#quiz">Find your talk</a></div>`,
  })}

<section class="sec" aria-labelledby="talksTitle">
  <div class="wrap">
    <div class="sec-head split">
      <div><p class="eyebrow reveal">Signature talks</p><h2 class="h2 reveal" id="talksTitle">Choose <em>by audience or format.</em></h2></div>
    </div>
    <div class="filter-bar reveal" id="talkFilters">
      <div class="filter-group" role="group" aria-label="Filter by audience"><span>Audience</span>
        <button type="button" class="chip on" data-filter="aud" data-value="">All</button>${AUDIENCES.map((a) => `<button type="button" class="chip" data-filter="aud" data-value="${esc(a)}">${esc(a)}</button>`).join('')}
      </div>
      <div class="filter-group" role="group" aria-label="Filter by format"><span>Format</span>
        <button type="button" class="chip on" data-filter="fmt" data-value="">All</button>${FORMATS.map((f) => `<button type="button" class="chip" data-filter="fmt" data-value="${esc(f)}">${esc(f)}</button>`).join('')}
      </div>
    </div>
    <p class="filter-count" id="filterCount" aria-live="polite"></p>
    <div class="talk-grid filterable">
      ${talks.map((t, i) => talkCard(t, i, r, tagAttrs(t.audiences, t.formats))).join('')}
    </div>
    <p class="filter-empty" id="filterEmpty" hidden>No talk matches both filters yet. <a href="${r}book/">Ask Yo's team</a>: every talk can be tailored.</p>
  </div>
</section>

<section class="sec dark oxblood grain" aria-labelledby="wsTitle">
  <div class="wrap">
    <div class="sec-head split">
      <div><p class="eyebrow eyebrow-gold reveal">Workshops &amp; trainings</p><h2 class="h2 reveal" id="wsTitle">Hands-on sessions <em>people use on Monday.</em></h2></div>
      <a class="link-arrow reveal" href="${r}speaking/workshops/">All workshops ${icon('arrow')}</a>
    </div>
    <div class="ws-grid">
      ${workshops.map((w, i) => `<article class="ws reveal" style="--d:${i * 90}ms"><p class="ws-fmt">${esc(w.format)}</p><h3>${esc(w.title)}</h3><p>${esc(w.text)}</p></article>`).join('')}
    </div>
  </div>
</section>

<section class="sec" aria-label="Find your talk">
  <div class="wrap">${quiz()}</div>
</section>

<section class="sec reel-sec" aria-labelledby="reelTitle">
  <div class="wrap reel-in">
    <div>
      <p class="eyebrow reveal">Speaking reel</p>
      <h2 class="h2 reveal" id="reelTitle">See Yo <em>on stage.</em></h2>
      <p class="reveal">The full speaking reel and past-event gallery are in production and will appear here after the photoshoot and next filmed events.</p>
      <p class="eyebrow reveal" style="margin-top:2rem">Event types served</p>
      <ul class="pill-list reveal">${eventTypes.map((e) => `<li>${esc(e)}</li>`).join('')}</ul>
    </div>
    <div class="reel reveal" data-video="${r}assets/video/reel.mp4">
      <img src="${r}images/yolanda.jpg" alt="" width="720" height="720" loading="lazy"/>
      <span class="reel-badge">${icon('play')} Reel coming soon</span>
    </div>
  </div>
</section>

<section class="sec blush" aria-labelledby="cnTitle">
  <div class="wrap cn-teaser">
    <div><p class="eyebrow reveal">Corporate &amp; nonprofit</p><h2 class="h2 reveal" id="cnTitle">Built for <em>your organization.</em></h2>
    <p class="reveal">Employee financial wellness, ERG programming, member education and community impact. See packages and request a proposal.</p></div>
    <a class="btn btn-dark magnetic reveal" href="${r}speaking/corporate-nonprofit/">Corporate &amp; nonprofit ${icon('arrow')}</a>
  </div>
</section>

${faq.html}
${ctaBand(r)}
`;

  return page({
    path: 'speaking/', depth, active: 'speaking/',
    title: 'Keynote Speaker on Business & Financial Wellness',
    description: 'Book Yolanda Butler for keynotes, workshops and panels on building a business around you, business credit, financial wellness and community.',
    body,
    schema: [
      { '@type': 'CollectionPage', '@id': abs('speaking/#webpage'), url: abs('speaking/'), name: 'Speaking', about: { '@id': ids.person } },
      { '@type': 'ItemList', name: 'Signature talks', itemListElement: talks.map((t, i) => ({ '@type': 'ListItem', position: i + 1, url: abs(`speaking/${t.slug}/`), name: t.title })) },
      bc.schema, faq.schema,
    ],
  });
};
