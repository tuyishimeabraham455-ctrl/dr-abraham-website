// ============================================================
//  CONTACT — general inquiry, shortcuts, direct email, social
// ============================================================
const site = require('../content/site');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero } = require('../lib/layout');

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'contact/';
  const bc = crumbs([['Contact', path]], depth);
  const shortcuts = [
    ['cal', 'Book Yo to speak', 'Keynotes, workshops and panels', 'book/'],
    ['file', 'Media & press', 'Interviews, quotes and features', 'press/#media'],
    ['mic', 'Be a podcast guest', 'Share your story with listeners', 'podcast/be-a-guest/'],
    ['star', 'Sponsor or partner', 'Reach founders and community builders', 'podcast/sponsor/'],
  ];

  const body = `
${pageHero({ mark: 'Hi', eyebrow: 'Contact', title: 'Let\'s <em>talk.</em>', lead: 'Questions, ideas and opportunities. Every message goes straight to Yo\'s team, and you\'ll hear back within one business day.', crumbsHtml: bc.html })}

<section class="sec" aria-label="Shortcuts">
  <div class="wrap">
    <div class="shortcuts">
      ${shortcuts.map(([ic, t, d, h], i) => `<a class="shortcut reveal" style="--d:${i * 70}ms" href="${r}${h}"><span class="asset-ic">${icon(ic)}</span><b>${esc(t)}</b><small>${esc(d)}</small><span class="sc-go">${icon('arrow')}</span></a>`).join('')}
    </div>
  </div>
</section>

<section class="sec" style="padding-top:0" aria-labelledby="formTitle">
  <div class="wrap final-in">
    <div>
      <p class="eyebrow reveal">General inquiry</p>
      <h2 class="h2 reveal" id="formTitle">Send <em>a message.</em></h2>
      <ul class="contact-list reveal">
        <li>${icon('mail')}<span><b>General</b><a href="mailto:${esc(site.email.hello)}">${esc(site.email.hello)}</a></span></li>
        <li>${icon('cal')}<span><b>Booking</b><a href="mailto:${esc(site.email.booking)}">${esc(site.email.booking)}</a></span></li>
        <li>${icon('file')}<span><b>Press</b><a href="mailto:${esc(site.email.press)}">${esc(site.email.press)}</a></span></li>
        <li>${icon('pin')}<span><b>Based in</b>${esc(site.person.location)} · Bay Area &amp; virtual</span></li>
      </ul>
      <div class="social social-light reveal">${site.social.map((s) => `<a href="${esc(s.url)}" aria-label="${esc(s.name)}" rel="noopener" target="_blank">${icon(s.icon)}</a>`).join('')}</div>
    </div>
    <form class="card-form js-form reveal" data-type="General" data-success="Thank you! Yo's team will reply within one business day.">
      <div class="row2"><div class="field"><label for="cName">Your name</label><input id="cName" name="name" required autocomplete="name"/></div><div class="field"><label for="cEmail">Email</label><input id="cEmail" name="email" type="email" required autocomplete="email"/></div></div>
      <div class="field"><label for="cTopic">What is this about?</label><select id="cTopic" name="event_type"><option>General question</option><option>Coaching</option><option>Speaking</option><option>Partnership</option><option>Something else</option></select></div>
      <div class="field"><label for="cMsg">Message</label><textarea id="cMsg" name="message" rows="5" required></textarea></div>
      <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about my message. See the <a href="${r}privacy/">privacy policy</a>.</span></label>
      <button class="btn btn-dark btn-block magnetic">Send message ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>
`;

  return page({
    path, depth, active: '',
    title: 'Contact Yolanda "Yo" Butler | The Business of You',
    description: 'Contact Yolanda "Yo" Butler and her team about speaking, coaching, media, podcast guest spots and partnerships.',
    body,
    schema: [{ '@type': 'ContactPage', '@id': abs('contact/#webpage'), url: abs(path), name: 'Contact', about: { '@id': ids.person } }, bc.schema],
  });
};
