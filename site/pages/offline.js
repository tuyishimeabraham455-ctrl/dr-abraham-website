// ============================================================
//  OFFLINE — shown by the service worker when there's no
//  connection and the page wasn't saved yet. Served at any URL,
//  so links resolve through a <base> set at runtime (like 404).
// ============================================================
const site = require('../content/site');
const { page, icon } = require('../lib/layout');

module.exports = () => {
  const body = `
<section class="nf grain">
  <span class="phero-mark" aria-hidden="true">Yo</span>
  <div class="wrap nf-in">
    <p class="eyebrow eyebrow-gold">You're offline</p>
    <h1 class="phero-title">No signal, <em>no problem.</em></h1>
    <p class="phero-lead">This page isn't saved on your phone yet. Pages you've opened before still work. Booking, Agent Yo and the portal come back as soon as you're online.</p>
    <div class="nf-links">
      <a href="./">${icon('home')}Home</a>
      <a href="./speaking/">${icon('mic')}Speaking</a>
      <a href="./book/">${icon('cal')}Book Yo</a>
    </div>
    <button type="button" class="btn btn-gold" onclick="location.reload()">Try again</button>
  </div>
</section>`;
  const html = page({ path: 'offline/', depth: 0, title: 'Offline | The Business of You', description: 'You are offline. Pages you have opened before are still available.', body, noindex: true, bodyClass: 'page-404' });
  const basePath = new URL(site.url).pathname;
  const baseTag = `<script>document.write('<base href="'+(location.pathname.indexOf(${JSON.stringify(basePath)})===0?${JSON.stringify(basePath)}:'/')+'"/>')</script>`;
  return html.replace('<meta charset="utf-8"/>', `<meta charset="utf-8"/>\n${baseTag}`);
};
