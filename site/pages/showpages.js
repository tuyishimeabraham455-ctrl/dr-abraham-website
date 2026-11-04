// ============================================================
//  Be a Guest · The Show · Sponsor & Partner
// ============================================================
const { show, sponsorship } = require('../content/podcast');
const site = require('../content/site');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const consent = (r) => `<div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about this. See the <a href="${r}privacy/">privacy policy</a>.</span></label>`;

// ---------------- Be a Guest ----------------
exports.guest = () => {
  const depth = 2, r = rel(depth), path = 'podcast/be-a-guest/';
  const bc = crumbs([['Podcast & Show', 'podcast/'], ['Be a guest', path]], depth);
  const faq = faqBlock([
    ['Who makes a great guest?', 'Founders, lenders, ministry and nonprofit leaders, coaches and community builders with a practical story listeners can learn from.'],
    ['How are episodes recorded?', 'Remotely by video, about 45 minutes, with a short planning call beforehand.'],
    ['When will I hear back?', 'We review every application and reply within two weeks.'],
  ]);
  const body = `
${pageHero({ mark: 'Mic', eyebrow: 'Be a guest', title: 'Have a story that helps <em>business owners grow?</em>', lead: 'Tell us what you would teach or share in one episode. We review every application.', crumbsHtml: bc.html, tone: 'oxblood' })}
<section class="sec" aria-label="Guest application">
  <div class="wrap final-in">
    <div>
      <p class="eyebrow reveal">What we look for</p>
      <h2 class="h2 reveal">Practical, <em>honest, generous.</em></h2>
      <ul class="ticks reveal"><li>${icon('check')}A clear lesson listeners can use this week</li><li>${icon('check')}Real experience: wins, mistakes and what you'd do again</li><li>${icon('check')}Topics around money, mindset, growth or community</li></ul>
    </div>
    <form class="card-form js-form reveal" data-type="Podcast guest" data-success="Application received! We reply to every pitch within two weeks.">
      <div class="row2"><div class="field"><label for="gName">Your name</label><input id="gName" name="name" required autocomplete="name"/></div><div class="field"><label for="gEmail">Email</label><input id="gEmail" name="email" type="email" required autocomplete="email"/></div></div>
      <div class="field"><label for="gOrg">Business or organization</label><input id="gOrg" name="organization" autocomplete="organization"/></div>
      <div class="field"><label for="gTopic">Episode topic</label><select id="gTopic" name="event_type"><option>Business growth</option><option>Credit &amp; funding</option><option>Mental wellness</option><option>Community &amp; social capital</option><option>Nonprofit or ministry</option><option>Something else</option></select></div>
      <div class="field"><label for="gLinks">Links (website, social, past interviews)</label><input id="gLinks" name="links" placeholder="https://"/></div>
      <div class="field"><label for="gPitch">Your pitch: what would listeners learn?</label><textarea id="gPitch" name="message" rows="4" required></textarea></div>
      ${consent(r)}
      <button class="btn btn-dark btn-block magnetic">Apply to be a guest ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>
${faq.html}`;
  return page({ path, depth, active: 'podcast/', title: 'Be a Guest on The Business of You Podcast', description: 'Apply to be a guest on The Business of You podcast with Yolanda "Yo" Butler. Share a practical story about money, mindset, growth or community.', body, schema: [bc.schema, faq.schema] });
};

// ---------------- The Show ----------------
exports.show = () => {
  const depth = 2, r = rel(depth), path = 'podcast/the-show/';
  const bc = crumbs([['Podcast & Show', 'podcast/'], ['The Show', path]], depth);
  const body = `
${pageHero({ mark: 'Show', eyebrow: 'The Show · coming soon', title: 'A talk show about <em>the business of you.</em>', lead: 'Live tapings, real stories and a community that grows together. The podcast is chapter one; The Show is what comes next.', crumbsHtml: bc.html })}
<section class="sec" aria-labelledby="trailerTitle">
  <div class="wrap reel-in">
    <div class="reel reveal" data-video="${r}assets/video/trailer.mp4"><img src="${r}images/yolanda.jpg" alt="" width="720" height="720" loading="lazy"/><span class="reel-badge">${icon('play')} Trailer coming soon</span></div>
    <div>
      <p class="eyebrow reveal">What to expect</p>
      <h2 class="h2 reveal" id="trailerTitle">Inspiration <em>you can use.</em></h2>
      <ul class="ticks reveal"><li>${icon('check')}Conversations with founders, lenders and community leaders</li><li>${icon('check')}Live tapings with audience Q&amp;A</li><li>${icon('check')}Segments that turn every story into a next step</li></ul>
    </div>
  </div>
</section>
<section class="sec dark grain" aria-labelledby="wlTitle">
  <div class="wrap cta-in" style="text-align:center">
    <h2 class="h2 big reveal" id="wlTitle">Be first <em>in the room.</em></h2>
    <p class="lead reveal" style="margin-inline:auto">Join the waitlist for launch dates, taping invitations and behind-the-scenes updates.</p>
    <form class="inline-form big reveal js-sub" data-source="show-waitlist" style="margin:2rem auto 0"><label class="sr" for="wlEmail">Email address</label><input id="wlEmail" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-gold magnetic">Join the waitlist</button></form>
    <p class="form-msg" aria-live="polite"></p>
  </div>
</section>
${ctaBand(r, { title: 'Want to partner <em>on The Show?</em>', primary: ['Sponsor & partner', 'podcast/sponsor/'], secondary: ['Be a guest', 'podcast/be-a-guest/'] })}`;
  return page({ path, depth, active: 'podcast/', title: 'The Show | The Business of You with Yolanda Butler', description: 'The Business of You is becoming a talk show with live tapings and community. Join the waitlist for launch dates and taping invitations.', body, schema: [bc.schema] });
};

// ---------------- Sponsor & Partner ----------------
exports.sponsor = () => {
  const depth = 2, r = rel(depth), path = 'podcast/sponsor/';
  const bc = crumbs([['Podcast & Show', 'podcast/'], ['Sponsor & partner', path]], depth);
  const body = `
${pageHero({ mark: '$', eyebrow: 'Sponsor & partner', title: 'Reach the people <em>building what\'s next.</em>', lead: 'Partner with The Business of You to reach founders, small business owners, nonprofit leaders and community builders.', crumbsHtml: bc.html, tone: 'oxblood', extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="#sponsor-form">Request the media kit ${icon('arrow')}</a></div>` })}
<section class="sec" aria-labelledby="audTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Audience</p><h2 class="h2 reveal" id="audTitle">Who <em>listens.</em></h2>
    <p class="reveal">Entrepreneurs at every stage, small business owners preparing to grow or borrow, nonprofit and ministry leaders, and the lenders and advisors who serve them. Audience numbers are shared in the media kit as the show launches.</p></div>
    <ul class="pill-list reveal" style="margin-top:1rem"><li>Founders</li><li>Small business owners</li><li>Nonprofit leaders</li><li>Ministries</li><li>Lenders &amp; CDFIs</li><li>Women entrepreneurs</li></ul>
  </div>
</section>
<section class="sec dark oxblood grain" aria-labelledby="spTitle">
  <div class="wrap">
    <div class="sec-head center"><p class="eyebrow eyebrow-gold reveal">Packages</p><h2 class="h2 reveal" id="spTitle">Ways <em>to partner.</em></h2><p class="lead reveal">Rates and audience data are shared in the media kit.</p></div>
    <div class="pkg-grid">${sponsorship.map((p, i) => `<article class="pkg reveal${p.featured ? ' featured' : ''}" style="--d:${i * 90}ms">${p.featured ? '<span class="pkg-flag">Most popular</span>' : ''}<h3>${esc(p.name)}</h3><p>${esc(p.text)}</p><ul class="ticks">${p.items.map((x) => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul><a class="btn ${p.featured ? 'btn-gold' : 'btn-ghost'} btn-block" href="#sponsor-form" data-package="${esc(p.name)}">Ask about this</a></article>`).join('')}</div>
  </div>
</section>
<section class="sec" id="sponsor-form" aria-labelledby="sfTitle">
  <div class="wrap final-in">
    <div><p class="eyebrow reveal">Media kit</p><h2 class="h2 reveal" id="sfTitle">Let's build <em>a partnership.</em></h2><p class="reveal">Tell us about your goals and we'll send the media kit with audience stats and rates.</p><p class="reveal">Or email <a class="link-inline" href="mailto:${esc(site.email.hello)}">${esc(site.email.hello)}</a></p></div>
    <form class="card-form js-form reveal" data-type="Sponsorship" data-success="Thank you! The media kit is on its way within two business days.">
      <div class="row2"><div class="field"><label for="sName">Your name</label><input id="sName" name="name" required autocomplete="name"/></div><div class="field"><label for="sEmail">Work email</label><input id="sEmail" name="email" type="email" required autocomplete="email"/></div></div>
      <div class="row2"><div class="field"><label for="sOrg">Company</label><input id="sOrg" name="organization" required autocomplete="organization"/></div><div class="field"><label for="pPkg">Interest</label><select id="pPkg" name="package">${sponsorship.map((p) => `<option>${esc(p.name)}</option>`).join('')}<option>Not sure yet</option></select></div></div>
      <div class="field"><label for="sGoals">Goals</label><textarea id="sGoals" name="message" rows="3" required></textarea></div>
      ${consent(r)}
      <button class="btn btn-dark btn-block magnetic">Request the media kit ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>`;
  return page({ path, depth, active: 'podcast/', title: 'Sponsor The Business of You Podcast', description: 'Sponsor or partner with The Business of You podcast and show to reach founders, small business owners, nonprofit leaders and community builders.', body, schema: [bc.schema] });
};
