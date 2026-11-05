// ============================================================
//  LEARN — hub, program pages, free resources (email-gated),
//  community waitlist
// ============================================================
const site = require('../content/site');
const { programs, resources } = require('../content/learn');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero, faqBlock } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const waitForm = (id, source, label, program = '') => `<form class="inline-form big js-sub" data-source="${source}"${program ? ` data-success="You're on the ${esc(program)} waitlist! You'll hear about dates and pricing first."` : ''}><label class="sr" for="${id}">Email address</label><input id="${id}" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-gold magnetic">${esc(label)}</button></form><p class="form-msg" aria-live="polite"></p>`;

// ---------------- Hub ----------------
exports.hub = () => {
  const depth = 1, r = rel(depth), path = 'learn/';
  const bc = crumbs([['Learn', path]], depth);
  const body = `
${pageHero({ mark: 'Learn', eyebrow: 'Learn with Yo', title: 'Build your business, <em>your voice, your future.</em>', lead: 'Training for entrepreneurs and aspiring speakers, free resources to start today, and a community on the way.', crumbsHtml: bc.html,
    extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="#programs">See programs ${icon('arrow')}</a><a class="btn btn-ghost magnetic" href="#resources">Free resources</a></div>` })}

<section class="sec" id="programs" aria-labelledby="progTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Training &amp; academy</p><h2 class="h2 reveal" id="progTitle">Programs that turn <em>ideas into income.</em></h2><p class="reveal">Each program runs live online in small groups. Enrollment opens in cohorts; join the waitlist to hear first.</p></div>
    <div class="talk-grid">
      ${programs.map((p, i) => `<article class="talk reveal" style="--d:${i * 90}ms"><span class="talk-n">0${i + 1}</span><p class="talk-kind">${esc(p.kind)} · ${esc(p.length)}</p><h3><a href="${r}learn/${p.slug}/">${esc(p.title)}</a></h3><p class="talk-sub">${esc(p.tagline)}</p><ul class="ticks">${p.outcomes.slice(0, 3).map((o) => `<li>${icon('check')}${esc(o)}</li>`).join('')}</ul><a class="link-arrow" href="${r}learn/${p.slug}/">See the syllabus ${icon('arrow')}</a></article>`).join('')}
    </div>
  </div>
</section>

<section class="sec blush" id="resources" aria-labelledby="resTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Free resources</p><h2 class="h2 reveal" id="resTitle">Start <em>today, for free.</em></h2></div>
    <div class="assets">
      ${resources.map((x, i) => `<a class="asset reveal" style="--d:${i * 70}ms" href="${r}learn/${x.slug}/"><span class="asset-ic">${icon(x.kind === 'Workbook' ? 'file' : 'check')}</span><span><b>${esc(x.title)}</b><small>${esc(x.kind)} · for ${esc(x.audience.toLowerCase())}</small></span></a>`).join('')}<a class="asset reveal" href="${r}learn/books/"><span class="asset-ic">${icon('star')}</span><span><b>Yo's bookshelf</b><small>Books · recommended reading</small></span></a>
    </div>
  </div>
</section>

<section class="sec dark grain" id="community" aria-labelledby="comTitle">
  <div class="wrap show-in">
    <div>
      <p class="eyebrow eyebrow-gold reveal">Community · coming soon</p>
      <h2 class="h2 reveal" id="comTitle">A room full of people <em>building, too.</em></h2>
      <p class="lead reveal">Live Q&amp;As with Yo, accountability circles and member perks. Join the waitlist and be first through the doors.</p>
      ${waitForm('comEmail', 'community-waitlist', 'Join the waitlist')}
      <a class="link-arrow reveal" href="${r}learn/community/">About the community ${icon('arrow')}</a>
    </div>
    <div class="show-cards">
      <div class="show-card reveal"><span class="asset-ic">${icon('users')}</span><b>Accountability circles</b><small>Small groups that keep each other moving.</small></div>
      <div class="show-card reveal" style="--d:80ms"><span class="asset-ic">${icon('mic')}</span><b>Live Q&amp;A with Yo</b><small>Bring your questions, leave with answers.</small></div>
      <div class="show-card reveal" style="--d:160ms"><span class="asset-ic">${icon('star')}</span><b>Member perks</b><small>Early access to programs, tapings and events.</small></div>
    </div>
  </div>
</section>

${ctaBand(r, { title: 'Not sure where <em>to start?</em>', lead: 'Agent Yo can suggest the right first step in a minute or two.', primary: ['Read the insights', 'blog/'], secondary: ['Ask Agent Yo', null] })}`;
  return page({ path, depth, active: 'learn/', title: 'Learn | Business & Speaker Training with Yo', description: 'Business and speaker training with Yolanda "Yo" Butler: cohort programs, a funding-ready intensive, free workbooks and checklists, and community.', body, schema: [{ '@type': 'CollectionPage', url: abs(path), name: 'Learn', about: { '@id': ids.person } }, bc.schema] });
};

// ---------------- Program page ----------------
exports.program = (slug) => {
  const p = programs.find((x) => x.slug === slug);
  const depth = 2, r = rel(depth), path = `learn/${p.slug}/`;
  const bc = crumbs([['Learn', 'learn/'], [p.title, path]], depth);
  const faq = faqBlock([
    ['When does the next cohort start?', 'Dates are announced to the waitlist first. Join the waitlist and you\'ll hear before enrollment opens.'],
    ['How much does it cost?', 'Pricing is shared when enrollment opens, along with any payment plans.'],
    ['Is it live or recorded?', `${p.format}. Sessions are recorded for members who miss one.`],
    ['Who is it for?', p.who],
  ]);
  const body = `
${pageHero({ mark: String(programs.indexOf(p) + 1).padStart(2, '0'), eyebrow: `${esc(p.kind)} · ${esc(p.length)}`, title: esc(p.title), lead: esc(p.tagline), crumbsHtml: bc.html, extra: `<div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="#waitlist">Join the waitlist ${icon('arrow')}</a></div>` })}
<section class="sec" aria-labelledby="sylTitle">
  <div class="wrap talk-detail">
    <div class="prose">
      <p class="eyebrow reveal">Syllabus</p>
      <h2 class="h2 reveal" id="sylTitle">What we'll <em>cover.</em></h2>
      <ol class="syllabus">${p.syllabus.map(([w, t, d], i) => `<li class="reveal" style="--d:${i * 60}ms"><span>${esc(w)}</span><div><b>${esc(t)}</b><p>${esc(d)}</p></div></li>`).join('')}</ol>
      <h2 class="h3 reveal">You'll leave with</h2>
      <ol class="outcomes reveal">${p.outcomes.map((o) => `<li>${esc(o)}</li>`).join('')}</ol>
    </div>
    <aside class="talk-facts reveal" aria-label="Program details">
      <dl><div><dt>Format</dt><dd>${esc(p.format)}</dd></div><div><dt>Length</dt><dd>${esc(p.length)}</dd></div><div><dt>Best for</dt><dd>${esc(p.who)}</dd></div><div><dt>Pricing</dt><dd>Shared when enrollment opens</dd></div></dl>
      <a class="btn btn-gold btn-block magnetic" href="#waitlist">Join the waitlist ${icon('arrow')}</a>
      <button type="button" class="btn btn-ghost-dark btn-block js-agent-open">Is this right for me?</button>
    </aside>
  </div>
</section>
<section class="sec dark grain" id="waitlist" aria-labelledby="wlTitle">
  <div class="wrap cta-in" style="text-align:center">
    <h2 class="h2 big reveal" id="wlTitle">Be first <em>when doors open.</em></h2>
    <p class="lead reveal" style="margin-inline:auto">Waitlist members hear about dates, pricing and early enrollment before anyone else.</p>
    <div class="reveal" style="max-width:560px;margin:2rem auto 0">${waitForm('wlEmail', 'cohort-waitlist:' + p.slug, 'Join the waitlist', p.title)}</div>
  </div>
</section>
${faq.html}`;
  return page({
    path, depth, active: 'learn/', title: `${p.title} | ${p.kind} with Yo`.slice(0, 60), description: `${p.tagline} ${p.who}`.slice(0, 155), body,
    schema: [{ '@type': 'Course', '@id': abs(path + '#course'), name: p.title, description: p.tagline, provider: { '@id': ids.org }, instructor: { '@id': ids.person }, url: abs(path), hasCourseInstance: { '@type': 'CourseInstance', courseMode: 'online', courseWorkload: p.length } }, bc.schema, faq.schema],
  });
};

// ---------------- Free resources (email-gated) ----------------
const RESOURCE_CONTENT = {
  workbook: [
    ['1. Name the person', ['Who exactly has this problem? Describe one real person in one sentence.', 'Where do they spend their time, and where could you meet them?']],
    ['2. Measure the pain', ['How often does the problem show up?', 'What does it cost them today in time, money or stress?', 'What do they use to solve it now, and what is wrong with it?']],
    ['3. Look for proof', ['Has anyone paid, or asked to pay, for a solution?', 'What is the smallest version you could sell this month?', 'Who are ten people you can talk to in the next two weeks?']],
    ['4. Map your strengths', ['Which skills do you use without effort?', 'Which experiences make you trusted on this problem?', 'Who already knows, likes and trusts you?']],
    ['5. Choose your first step', ['Build, adjust or move on: which did the answers point to?', 'What is one action you will take within seven days?', 'Who will you tell, so someone holds you to it?']],
  ],
  'funding-checklist': [
    ['Week 1 · Foundation', ['Business bank account opened and used for every business dollar', 'Business registered; EIN on file', 'Same name, address and phone everywhere', 'Personal credit report reviewed']],
    ['Week 2 · Numbers', ['Profit and loss statement for the last 12 months', 'Balance sheet', 'Last 3 to 6 months of bank statements', 'Simple cash-flow forecast for the next 12 months']],
    ['Week 3 · Documents', ['Business and personal tax returns (often 2 years)', 'Licenses, registrations and key contracts', 'Ownership information for each owner', 'List of current debts and payments']],
    ['Week 4 · Story', ['How much you need and exactly what it is for', 'How the money grows the business', 'How and when you will repay', 'A two-minute explanation you have practiced out loud']],
  ],
  'event-planner-checklist': [
    ['Before you book', ['Event goal in one sentence', 'Audience: who, how many, what they need', 'Format and length: keynote, workshop, panel, virtual', 'Budget range and what it includes (travel, materials)']],
    ['After you book', ['Signed agreement with date, time, fee and cancellation terms', 'Planning call to tailor the talk', 'Speaker bio, headshot and intro script from the press kit', 'Tech needs: microphone, slides, clicker, confidence monitor']],
    ['On the day', ['Arrival time, green room and point of contact', 'A/V check 30 minutes before', 'Emcee introduction rehearsed', 'Water on stage and a clear time cue']],
    ['After the event', ['Share attendee takeaways or the worksheet', 'Collect feedback while it is fresh', 'Thank-you note and testimonial request', 'Ideas for a follow-up workshop or series']],
  ],
};

exports.resource = (slug) => {
  const x = resources.find((y) => y.slug === slug);
  const depth = 2, r = rel(depth), path = `learn/${x.slug}/`;
  const bc = crumbs([['Learn', 'learn/'], [x.title, path]], depth);
  const body = `
${pageHero({ mark: x.kind === 'Workbook' ? 'Wb' : '✓', eyebrow: `Free ${esc(x.kind.toLowerCase())} · for ${esc(x.audience.toLowerCase())}`, title: esc(x.title), lead: esc(x.text), crumbsHtml: bc.html })}
<section class="sec" aria-label="${esc(x.title)}">
  <div class="wrap gate" data-gate="${x.slug}">
    <div class="gate-form reveal">
      <p class="eyebrow">Get instant access</p>
      <h2 class="h3" style="margin-top:0">Enter your email to unlock the ${esc(x.kind.toLowerCase())}.</h2>
      <p>You'll also get the Sunday Letter. Unsubscribe in one click.</p>
      <form class="inline-form big js-sub" data-source="resource:${x.slug}" data-unlock="${x.slug}" data-success="You're in! Your ${esc(x.kind.toLowerCase())} is unlocked below."><label class="sr" for="gateEmail">Email address</label><input id="gateEmail" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-dark magnetic">Unlock it</button></form>
      <p class="form-msg" aria-live="polite"></p>
    </div>
    <article class="printable" id="resourceBody" hidden>
      <div class="sheet-tools"><span class="eyebrow" style="margin:0">${esc(x.kind)}</span><button type="button" class="btn btn-dark btn-sm js-print">Print or save as PDF</button></div>
      ${RESOURCE_CONTENT[x.slug].map(([h, items]) => `<section class="res-block"><h2 class="h3">${esc(h)}</h2><ul class="${x.kind === 'Workbook' ? 'write-lines' : 'checklist'}">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></section>`).join('')}
      <p class="fine">Education, not financial or legal advice. © The Business of You · ${esc(site.person.name)}</p>
    </article>
  </div>
</section>
${ctaBand(r, { title: 'Want help <em>with the next step?</em>', primary: x.audience === 'Event planners' ? ['Book Yo', 'book/'] : ['See programs', 'learn/'], secondary: ['Ask Agent Yo', null] })}`;
  return page({ path, depth, active: 'learn/', title: `${x.title} | Free ${x.kind}`.slice(0, 60), description: `${x.text} A free ${x.kind.toLowerCase()} from Yolanda "Yo" Butler for ${x.audience.toLowerCase()}.`.slice(0, 155), body, schema: [bc.schema] });
};

// ---------------- Community ----------------
exports.community = () => {
  const depth = 2, r = rel(depth), path = 'learn/community/';
  const bc = crumbs([['Learn', 'learn/'], ['Community', path]], depth);
  const body = `
${pageHero({ mark: 'Us', eyebrow: 'Community · phase 2', title: 'Build alongside people <em>who get it.</em>', lead: 'A private community for entrepreneurs and speakers growing the business of you, together.', crumbsHtml: bc.html })}
<section class="sec" aria-labelledby="perksTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Member perks</p><h2 class="h2 reveal" id="perksTitle">What's <em>inside.</em></h2></div>
    <div class="values">
      <article class="value reveal"><span class="value-n">I</span><h3>Accountability circles</h3><p>Small groups that meet regularly and keep each other moving.</p></article>
      <article class="value reveal" style="--d:80ms"><span class="value-n">II</span><h3>Live Q&amp;A</h3><p>Regular sessions with Yo on business, money and mindset.</p></article>
      <article class="value reveal" style="--d:160ms"><span class="value-n">III</span><h3>Resource library</h3><p>Workbooks, templates and recordings in one place.</p></article>
      <article class="value reveal" style="--d:240ms"><span class="value-n">IV</span><h3>First access</h3><p>Early enrollment for programs, tapings and events.</p></article>
    </div>
  </div>
</section>
<section class="sec dark grain" aria-labelledby="cwTitle">
  <div class="wrap cta-in" style="text-align:center">
    <h2 class="h2 big reveal" id="cwTitle">Save <em>your seat.</em></h2>
    <p class="lead reveal" style="margin-inline:auto">The community opens in phase two. Waitlist members get founding-member perks.</p>
    <div class="reveal" style="max-width:560px;margin:2rem auto 0">${waitForm('cwEmail', 'community-waitlist', 'Join the waitlist')}</div>
  </div>
</section>`;
  return page({ path, depth, active: 'learn/', title: 'Community Waitlist | The Business of You', description: 'Join the waitlist for The Business of You community: accountability circles, live Q&A with Yo, a resource library and first access to programs.', body, schema: [bc.schema] });
};
