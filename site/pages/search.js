// ============================================================
//  SEARCH — client-side, over search-index.json written by build.js
// ============================================================
const { page, icon, rel, crumbs, pageHero } = require('../lib/layout');

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'search/';
  const bc = crumbs([['Search', path]], depth);
  const body = `
${pageHero({ mark: '?', eyebrow: 'Search', title: 'Find what you <em>need.</em>', lead: 'Talks, episodes, articles, programs and free resources, all in one place.', crumbsHtml: bc.html,
    extra: `<form class="srch-form reveal" role="search" id="srchForm"><label class="sr" for="srchQ">Search the site</label><span class="search-field">${icon('search')}<input id="srchQ" name="q" type="search" placeholder="Try “funding”, “keynote” or “burnout”" autocomplete="off"/></span></form>` })}
<section class="sec" aria-label="Search results">
  <div class="wrap srch-in">
    <p class="srch-count" id="srchCount" aria-live="polite"></p>
    <ol class="srch-list" id="srchList"></ol>
    <div class="srch-empty" id="srchEmpty" hidden>
      <p>Nothing matched that search. Try a shorter word, or <button type="button" class="linkish js-agent-open">ask Agent Yo</button>.</p>
    </div>
  </div>
</section>`;
  return page({ path, depth, title: 'Search | The Business of You', description: 'Search talks, podcast episodes, articles, programs and free resources from Yolanda Butler and The Business of You.', body, noindex: true, scripts: ['assets/js/search.js'], schema: [bc.schema] });
};
