// ============================================================
//  WATCH — the show's video library (videos and photos added by
//  the admin under Admin · Media; filled in by assets/js/media.js)
// ============================================================
const { page, icon, rel, crumbs, pageHero } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'watch/';
  const bc = crumbs([['Watch', path]], depth);
  const body = `
${pageHero({ mark: '▶', eyebrow: 'The Business of You Show', title: 'Watch, learn, <em>build.</em>', lead: 'Keynote moments, interviews and short lessons on building a business around you, financial wellness and the power of community.', crumbsHtml: bc.html })}
<section class="sec" id="watchApp" aria-label="Videos">
  <div class="wrap">
    <div class="mv-feat" id="watchFeatured" hidden></div>
    <div id="watchEpisodes" hidden>
      <div class="mv-head"><h2 class="h2">All <em>episodes.</em></h2><div class="chips-row" id="watchCats" role="group" aria-label="Filter by topic"></div></div>
      <div class="mv-grid" id="watchGrid"></div>
    </div>
    <div id="watchPhotos" class="mv-photos" hidden><h2 class="h2">Behind <em>the scenes.</em></h2><div class="mv-gallery-slot"></div></div>
    <div class="mv-empty" id="watchEmpty" hidden>
      ${icon('play')}
      <h2 class="h3">New episodes are on the way.</h2>
      <p>Subscribe to the podcast or join the Sunday Letter to hear when the next one is out.</p>
      <a class="btn btn-dark" href="${r}podcast/">Listen to the podcast ${icon('arrow')}</a>
    </div>
  </div>
</section>
${ctaBand(r, { title: 'Bring this <em>to your stage.</em>', lead: 'Book Yo for your conference, company or community event.', primary: ['Book Yo', 'book/'], secondary: ['See the talks', 'speaking/'] })}`;
  return page({ path, depth, title: 'Watch the Show | The Business of You', description: 'Watch The Business of You show: keynote moments, interviews and short lessons from Yolanda "Yo" Butler.', body, active: 'watch/', scripts: ['assets/js/media.js'], schema: [{ '@type': 'CollectionPage', name: 'Watch The Business of You', url: require('../lib/layout').abs(path) }, bc.schema] });
};
