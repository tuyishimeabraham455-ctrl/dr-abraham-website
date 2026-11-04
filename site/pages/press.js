// ============================================================
//  PRESS KIT — one-sheet, bios, headshots, logos, emcee intro,
//  media request form, press & features
// ============================================================
const site = require('../content/site');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const EMCEE = `Our next speaker has spent more than thirty years building businesses, and helping others build theirs. She ran her own preschool in Oakland for thirteen years, trained women entrepreneurs, advised small business owners at the Contra Costa SBDC, and spent more than thirteen years at Operation HOPE, most recently as a Financial Well-Being Coach. Today she teaches entrepreneurs how to build a business around themselves, with clear strategy, financial confidence and the right people in their corner. Please welcome the creator of The Business of You, Yolanda "Yo" Butler.`;

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'press/';
  const bc = crumbs([['Press', path]], depth);

  const asset = (title, meta, href, dl, ic = 'down') => `<a class="asset reveal" href="${href}" ${dl ? `download="${dl}"` : ''}><span class="asset-ic">${icon(ic)}</span><span><b>${esc(title)}</b><small>${esc(meta)}</small></span></a>`;

  const body = `
${pageHero({ mark: 'Press', eyebrow: 'Press & media kit', title: 'Everything you need, <em>in one place.</em>', lead: 'One-sheet, bios, headshots, logos and an emcee introduction for event planners, hosts and journalists.', crumbsHtml: bc.html, extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="${r}press/one-sheet/">Open the one-sheet ${icon('arrow')}</a><a class="btn btn-ghost magnetic" href="#media">Media request</a></div>` })}

<section class="sec" id="one-sheet" aria-labelledby="kitTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Downloads</p><h2 class="h2 reveal" id="kitTitle">Press <em>assets.</em></h2></div>
    <div class="assets">
      ${asset('Speaker one-sheet', 'Printable page · save as PDF', `${r}press/one-sheet/`, '', 'file')}
      ${asset('Headshot', 'JPG · 720 × 720', `${r}images/yolanda.jpg`, 'yolanda-butler-headshot.jpg')}
      ${asset('Logo, for light backgrounds', 'SVG · vector', `${r}assets/brand/logo-on-light.svg`, 'business-of-you-logo-light.svg')}
      ${asset('Logo, for dark backgrounds', 'SVG · vector', `${r}assets/brand/logo-on-dark.svg`, 'business-of-you-logo-dark.svg')}
      ${asset('Monogram', 'SVG · square', `${r}assets/brand/monogram.svg`, 'yo-monogram.svg')}
      ${asset('Bios: short, medium, long', 'Copy or download', `${r}about/#bios`, '', 'link')}
    </div>
    <p class="fine reveal">High-resolution portraits and stage photos from the upcoming photoshoot will be added here.</p>
  </div>
</section>

<section class="sec dark grain" aria-labelledby="emceeTitle">
  <div class="wrap emcee-in">
    <div>
      <p class="eyebrow eyebrow-gold reveal">For hosts &amp; emcees</p>
      <h2 class="h2 reveal" id="emceeTitle">Introduction <em>script.</em></h2>
      <p class="lead reveal">About 45 seconds read aloud. Please read it as written, or ask us for a shorter version.</p>
    </div>
    <div class="emcee reveal" data-copy>
      <p class="emcee-text">${esc(EMCEE)}</p>
      <div class="bio-actions"><button type="button" class="btn btn-gold btn-sm js-copy">Copy script</button><span class="form-msg" aria-live="polite"></span></div>
    </div>
  </div>
</section>

<section class="sec" aria-labelledby="factsTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Quick facts</p><h2 class="h2 reveal" id="factsTitle">At <em>a glance.</em></h2></div>
    <dl class="facts reveal">
      <div><dt>Name</dt><dd>Yolanda "Yo" Butler</dd></div>
      <div><dt>Title</dt><dd>${esc(site.person.jobTitle)}</dd></div>
      <div><dt>Based in</dt><dd>${esc(site.person.location)} · serving the Bay Area and virtual audiences</dd></div>
      <div><dt>Experience</dt><dd>${site.facts.yearsEntrepreneur} years as an entrepreneur · ${site.facts.yearsHope} years at Operation HOPE</dd></div>
      <div><dt>Education</dt><dd>Business Administration, Cal State East Bay · former president, Black Business Association</dd></div>
      <div><dt>Topics</dt><dd>Building a business around you · business credit · financial and mental wellness · social capital</dd></div>
    </dl>
  </div>
</section>

<section class="sec blush" aria-labelledby="featTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Press &amp; features</p><h2 class="h2 reveal" id="featTitle">In <em>the media.</em></h2></div>
    <p class="reveal empty-note">Interviews, podcast appearances and articles will be listed here as they are published. Interviewing Yo? <a href="#media">Send a media request</a>.</p>
  </div>
</section>

<section class="sec" id="media" aria-labelledby="mediaTitle">
  <div class="wrap final-in">
    <div>
      <p class="eyebrow reveal">Media requests</p>
      <h2 class="h2 reveal" id="mediaTitle">Interviews, podcasts <em>&amp; features.</em></h2>
      <p class="reveal">Tell us about your outlet and deadline. Press requests are answered within one business day.</p>
      <p class="reveal">Or email <a class="link-inline" href="mailto:${esc(site.email.press)}">${esc(site.email.press)}</a></p>
    </div>
    <form class="card-form js-form reveal" data-type="Media request" data-success="Thank you! We'll reply within one business day.">
      <div class="row2"><div class="field"><label for="mName">Your name</label><input id="mName" name="name" required autocomplete="name"/></div><div class="field"><label for="mEmail">Email</label><input id="mEmail" name="email" type="email" required autocomplete="email"/></div></div>
      <div class="row2"><div class="field"><label for="mOutlet">Outlet</label><input id="mOutlet" name="organization" required/></div><div class="field"><label for="mDeadline">Deadline</label><input id="mDeadline" name="event_date" type="date"/></div></div>
      <div class="field"><label for="mKind">Request type</label><select id="mKind" name="event_type"><option>Interview</option><option>Podcast guest</option><option>Quote or comment</option><option>Feature or profile</option><option>Other</option></select></div>
      <div class="field"><label for="mMsg">Details</label><textarea id="mMsg" name="message" rows="3" required></textarea></div>
      <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about this request.</span></label>
      <button class="btn btn-dark btn-block magnetic">Send media request ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>

${ctaBand(r)}
`;

  return page({
    path, depth, active: 'press/',
    title: 'Press Kit | Yolanda "Yo" Butler',
    description: 'Press kit for Yolanda "Yo" Butler: speaker one-sheet, bios, headshot, logos, emcee introduction script and media requests.',
    body,
    schema: [{ '@type': 'WebPage', '@id': abs('press/#webpage'), url: abs('press/'), name: 'Press kit', about: { '@id': ids.person } }, bc.schema],
  });
};
