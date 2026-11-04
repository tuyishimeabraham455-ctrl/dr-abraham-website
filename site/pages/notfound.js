// ============================================================
//  404 — served at any missing URL (GitHub Pages and server.js),
//  so links are resolved through a <base> set at runtime.
// ============================================================
const site = require('../content/site');
const { page, icon } = require('../lib/layout');

module.exports = () => {
  const body = `
<section class="nf grain">
  <span class="phero-mark" aria-hidden="true">404</span>
  <div class="wrap nf-in">
    <p class="eyebrow eyebrow-gold">Page not found</p>
    <h1 class="phero-title">This page took <em>a detour.</em></h1>
    <p class="phero-lead">The link may be old or mistyped. Let's get you where you were going.</p>
    <form class="nf-search" action="./search/" method="get" role="search">
      <label class="sr" for="nfq">Search the site</label>
      <span class="search-field">${icon('search')}<input id="nfq" name="q" type="search" placeholder="Search talks, episodes, articles…"/></span>
      <button class="btn btn-gold">Search</button>
    </form>
    <div class="nf-links">
      <a href="./">${icon('arrow')}Home</a>
      <a href="./speaking/">${icon('mic')}Speaking</a>
      <a href="./book/">${icon('cal')}Book Yo</a>
      <a href="./podcast/">${icon('play')}Podcast</a>
      <a href="./learn/">${icon('build')}Learn</a>
    </div>
    <p class="nf-agent">Not sure where to look? <button type="button" class="linkish js-agent-open">Ask Agent Yo</button> and I'll point the way.</p>
  </div>
</section>`;
  const html = page({ path: '404.html', depth: 0, title: 'Page not found | The Business of You', description: 'This page could not be found. Search the site or ask Agent Yo for the right next step.', body, noindex: true, bodyClass: 'page-404' });
  // Resolve "./" links from the site root, whatever URL the 404 was served at
  const basePath = new URL(site.url).pathname;
  const baseTag = `<script>document.write('<base href="'+(location.pathname.indexOf(${JSON.stringify(basePath)})===0?${JSON.stringify(basePath)}:'/')+'"/>')</script>`;
  return html.replace('<meta charset="utf-8"/>', `<meta charset="utf-8"/>\n${baseTag}`);
};
