// ============================================================
//  PODCAST HUB — subscribe, searchable archive, show, guest, sponsor
// ============================================================
const { show, episodes } = require('../content/podcast');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, sampleTag } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const topics = [...new Set(episodes.map((e) => e.topic))];

// Archive card (also used on the homepage via r = './')
const epCard = (e, r) => `<a class="ep-card reveal" href="${r}podcast/${e.slug}/" data-topic="${esc(e.topic)}" data-search="${esc((e.title + ' ' + e.summary + ' ' + e.guest + ' ' + e.topic).toLowerCase())}">
  <span class="ep-card-n">${String(e.n).padStart(2, '0')}</span>
  <span class="ep-card-body"><span class="ep-meta">${esc(e.topic)} · ${e.minutes} min ${sampleTag(e)}</span><b>${esc(e.title)}</b><small>${esc(e.guest)}</small></span>
  <span class="ep-card-go">${icon('play')}</span>
</a>`;

const subscribeLinks = (cls = '') => {
  const live = show.platforms.filter((p) => p.url);
  return live.length
    ? `<div class="subscribe ${cls}">${live.map((p) => `<a class="chip" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}</a>`).join('')}</div>`
    : `<p class="fine ${cls}">Subscribe links for Apple Podcasts, Spotify, YouTube and RSS appear here at launch.</p>`;
};

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'podcast/';
  const bc = crumbs([['Podcast & Show', path]], depth);

  const body = `
${pageHero({ mark: 'Pod', eyebrow: `The podcast · ${esc(show.status.toLowerCase())}`, title: 'Conversations about building <em>the business of you.</em>', lead: esc(show.description), crumbsHtml: bc.html, tone: 'oxblood',
    extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="#launch">Join the launch list ${icon('arrow')}</a><a class="btn btn-ghost magnetic" href="${r}podcast/be-a-guest/">Be a guest</a></div>` })}

<section class="sec" aria-labelledby="archTitle">
  <div class="wrap">
    <div class="sec-head split">
      <div><p class="eyebrow reveal">Episode archive</p><h2 class="h2 reveal" id="archTitle">Find <em>your episode.</em></h2></div>
      ${subscribeLinks('reveal')}
    </div>
    <div class="filter-bar reveal" id="epFilters">
      <label class="search-field"><span class="sr">Search episodes</span>${icon('search')}<input type="search" id="epSearch" placeholder="Search by topic, guest or idea" autocomplete="off"/></label>
      <div class="filter-group" role="group" aria-label="Filter by topic"><span>Topic</span><button type="button" class="chip on" data-topic="">All</button>${topics.map((t) => `<button type="button" class="chip" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    </div>
    <p class="filter-count" id="epCount" aria-live="polite"></p>
    <div class="ep-grid" id="epGrid">${episodes.map((e) => epCard(e, r)).join('')}</div>
    <p class="filter-empty" id="epEmpty" hidden>No episodes match that yet. <a href="${r}podcast/be-a-guest/">Pitch the episode you want to hear</a>.</p>
  </div>
</section>

<section class="sec dark grain" id="launch" aria-labelledby="launchTitle">
  <div class="wrap show-in">
    <div>
      <p class="eyebrow eyebrow-gold reveal">The Show</p>
      <h2 class="h2 reveal" id="launchTitle">A talk show is <em>coming.</em></h2>
      <p class="lead reveal">The podcast is the first chapter. Next: The Show, with live tapings, guests and community. Join the list for launch dates and first access to tapings.</p>
      <form class="inline-form big reveal js-sub" data-source="show-waitlist"><label class="sr" for="launchEmail">Email address</label><input id="launchEmail" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-gold magnetic">Join the list</button></form>
      <p class="form-msg" aria-live="polite"></p>
      <a class="link-arrow reveal" href="${r}podcast/the-show/">About The Show ${icon('arrow')}</a>
    </div>
    <div class="show-cards">
      <a class="show-card reveal" href="${r}podcast/be-a-guest/"><span class="asset-ic">${icon('mic')}</span><b>Be a guest</b><small>Share a story that helps business owners grow.</small></a>
      <a class="show-card reveal" style="--d:80ms" href="${r}podcast/sponsor/"><span class="asset-ic">${icon('star')}</span><b>Sponsor &amp; partner</b><small>Reach founders and community builders.</small></a>
      <a class="show-card reveal" style="--d:160ms" href="${r}press/"><span class="asset-ic">${icon('file')}</span><b>Press</b><small>Media kit, one-sheet and interview requests.</small></a>
    </div>
  </div>
</section>

${ctaBand(r, { title: 'Prefer Yo <em>live on your stage?</em>', primary: ['Book Yo', 'book/'], secondary: ['See her talks', 'speaking/'] })}
`;

  return page({
    path, depth, active: 'podcast/',
    title: 'The Business of You Podcast | Yolanda Butler',
    description: 'The Business of You podcast with Yolanda "Yo" Butler: founders, lenders and community builders on money, mindset and growth.',
    body, scripts: ['assets/js/podcast.js'],
    schema: [
      { '@type': 'PodcastSeries', '@id': abs('podcast/#series'), name: show.name, description: show.description, url: abs(path), author: { '@id': ids.person }, webFeed: show.platforms.find((p) => p.name === 'RSS')?.url || undefined },
      bc.schema,
    ],
  });
};
module.exports.epCard = epCard;
