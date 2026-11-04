// ============================================================
//  CORPORATE & NONPROFIT — tailored messaging, packages, proposal
// ============================================================
const site = require('../content/site');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const corporate = {
  outcomes: [['Retention', 'Financial stress is a top driver of turnover. Give people tools that lower it.'], ['Culture', 'Programming that builds belonging, confidence and connection across teams.'], ['ERG impact', 'Ready-made sessions for employee resource groups and heritage months.']],
  uses: ['Employee financial wellness series', 'ERG and heritage-month programming', 'Leadership offsites and all-hands', 'Supplier diversity and small-business programs'],
};
const nonprofit = {
  outcomes: [['Community impact', 'Members leave with plans they can act on, not just inspiration.'], ['Fundraising', 'A speaker who helps donors see the economic power of your mission.'], ['Program depth', 'Workshops that plug directly into your existing classes and cohorts.']],
  uses: ['Member education for credit unions and CDFIs', 'Small business center cohorts', 'Ministry and congregation programs', 'Galas, luncheons and donor events'],
};
// Packages: no prices shown (blueprint: never invent fees)
const packages = [
  { name: 'Keynote', text: 'One signature talk, tailored to your audience, with a pre-event planning call.', items: ['30 to 60 minutes', 'Planning call', 'Attendee worksheet'] },
  { name: 'Keynote + Workshop', text: 'Inspire the room, then turn ideas into action in a hands-on session.', items: ['Keynote', '90-minute workshop', 'Companion workbook'], featured: true },
  { name: 'Series', text: 'A multi-session program for cohorts, employees or members over several weeks.', items: ['3 to 6 sessions', 'Live or virtual', 'Progress check-ins'] },
];

module.exports = () => {
  const depth = 2, r = rel(depth), path = 'speaking/corporate-nonprofit/';
  const bc = crumbs([['Speaking', 'speaking/'], ['Corporate & nonprofit', path]], depth);
  const faq = faqBlock([
    ['Do you work with nonprofits on limited budgets?', 'Yes. Tell us about your goals and budget range in the proposal form; Yo\'s team will suggest the best fit.'],
    ['Can sessions be part of an employee benefits program?', 'Yes. The financial wellness series is designed to complement existing benefits and EAP resources.'],
    ['Do you provide case studies?', 'Case studies are being written up with past partners and will be shared here as they are approved.'],
  ]);

  const audience = (id, title, data) => `<div class="aud-panel" id="${id}" role="tabpanel" aria-labelledby="t-${id}"${id === 'nonprofit' ? ' hidden' : ''}>
    <div class="aud-out">${data.outcomes.map(([h, p], i) => `<article class="value"><span class="value-n">${['I', 'II', 'III'][i]}</span><h3>${esc(h)}</h3><p>${esc(p)}</p></article>`).join('')}</div>
    <div class="aud-uses"><p class="eyebrow">Popular for</p><ul class="ticks">${data.uses.map((u) => `<li>${icon('check')}${esc(u)}</li>`).join('')}</ul></div>
  </div>`;

  const body = `
${pageHero({
    mark: '&amp;', eyebrow: 'Corporate & nonprofit', title: 'Programs built <em>for your organization.</em>', lead: 'Financial wellness, entrepreneurship and community programming for companies, nonprofits, credit unions and ministries.', crumbsHtml: bc.html, extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="#proposal">Request a proposal ${icon('arrow')}</a></div>` })}

<section class="sec" aria-labelledby="audTitle">
  <div class="wrap">
    <div class="sec-head split"><div><p class="eyebrow reveal">Outcomes planners care about</p><h2 class="h2 reveal" id="audTitle">Choose <em>your audience.</em></h2></div></div>
    <div class="seg reveal" role="tablist" aria-label="Organization type" data-tabs>
      <button type="button" role="tab" id="t-corporate" aria-controls="corporate" aria-selected="true">Corporate</button>
      <button type="button" role="tab" id="t-nonprofit" aria-controls="nonprofit" aria-selected="false" tabindex="-1">Nonprofit &amp; ministry</button>
    </div>
    ${audience('corporate', 'Corporate', corporate)}
    ${audience('nonprofit', 'Nonprofit', nonprofit)}
  </div>
</section>

<section class="sec dark oxblood grain" aria-labelledby="pkgTitle">
  <div class="wrap">
    <div class="sec-head center"><p class="eyebrow eyebrow-gold reveal">Packages</p><h2 class="h2 reveal" id="pkgTitle">Three ways <em>to work together.</em></h2><p class="lead reveal">Every package is tailored. Fees depend on scope, length and location, and are shared in your proposal.</p></div>
    <div class="pkg-grid">${packages.map((p, i) => `<article class="pkg reveal${p.featured ? ' featured' : ''}" style="--d:${i * 90}ms">${p.featured ? '<span class="pkg-flag">Most requested</span>' : ''}<h3>${esc(p.name)}</h3><p>${esc(p.text)}</p><ul class="ticks">${p.items.map((x) => `<li>${icon('check')}${esc(x)}</li>`).join('')}</ul><a class="btn ${p.featured ? 'btn-gold' : 'btn-ghost'} btn-block" href="#proposal" data-package="${esc(p.name)}">Request this package</a></article>`).join('')}</div>
  </div>
</section>

<section class="sec" id="proposal" aria-labelledby="propTitle">
  <div class="wrap final-in">
    <div>
      <p class="eyebrow reveal">Request a proposal</p>
      <h2 class="h2 reveal" id="propTitle">Tell us <em>what success looks like.</em></h2>
      <p class="reveal">Share a few details and Yo's team will send a tailored proposal within two business days.</p>
      <p class="fine reveal">Case studies are on the way and will be added as partners approve them.</p>
    </div>
    <form class="card-form js-form reveal" data-type="Proposal request" data-success="Thank you! A tailored proposal is on its way within two business days.">
      <div class="row2"><div class="field"><label for="pName">Your name</label><input id="pName" name="name" required autocomplete="name"/></div><div class="field"><label for="pEmail">Work email</label><input id="pEmail" name="email" type="email" required autocomplete="email"/></div></div>
      <div class="row2"><div class="field"><label for="pOrg">Organization</label><input id="pOrg" name="organization" required autocomplete="organization"/></div>
        <div class="field"><label for="pType">Organization type</label><select id="pType" name="event_type"><option>Corporate</option><option>Nonprofit</option><option>Credit union or CDFI</option><option>Ministry</option><option>Government or education</option></select></div></div>
      <div class="row2"><div class="field"><label for="pPkg">Package</label><select id="pPkg" name="package"><option>Keynote</option><option>Keynote + Workshop</option><option>Series</option><option>Not sure yet</option></select></div>
        <div class="field"><label for="pBudget">Budget range</label><select id="pBudget" name="budget"><option>Not sure yet</option><option>Under $2,500</option><option>$2,500 to $5,000</option><option>$5,000 to $10,000</option><option>$10,000+</option></select></div></div>
      <div class="field"><label for="pGoal">Goals for your audience</label><textarea id="pGoal" name="message" rows="3" required></textarea></div>
      <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about this request. See the <a href="${r}privacy/">privacy policy</a>.</span></label>
      <button class="btn btn-dark btn-block magnetic">Request my proposal ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>

${faq.html}
${ctaBand(r, { secondary: ['See all talks', 'speaking/'] })}
`;

  return page({
    path, depth, active: 'speaking/',
    title: 'Corporate & Nonprofit Speaker | Yolanda Butler',
    description: 'Financial wellness and entrepreneurship programs for companies, nonprofits, credit unions and ministries. Request a tailored proposal.',
    body,
    schema: [
      { '@type': 'Service', name: 'Corporate and nonprofit speaking programs', serviceType: 'Speaking and training', provider: { '@id': ids.person }, areaServed: site.person.area, audience: [{ '@type': 'Audience', audienceType: 'Corporate' }, { '@type': 'Audience', audienceType: 'Nonprofit' }], url: abs(path) },
      bc.schema, faq.schema,
    ],
  });
};
