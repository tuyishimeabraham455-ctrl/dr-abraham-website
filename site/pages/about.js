// ============================================================
//  ABOUT — story, timeline, philosophy, bios, headshot
// ============================================================
const site = require('../content/site');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

// Bios built only from real facts (blueprint: "downloadable bio: short, medium, long")
const bios = {
  short: `Yolanda "Yo" Butler is a keynote speaker, podcaster and business strategist who teaches entrepreneurs how to build a business around themselves. A 30+ year entrepreneur, she spent 13+ years at Operation HOPE, most recently as a Financial Well-Being Coach.`,
  medium: `Yolanda "Yo" Butler is a keynote speaker, podcaster and business strategist based in Antioch, California. She teaches entrepreneurs how to build a business around themselves, blending business strategy with mental and financial wellness. An entrepreneur for more than 30 years, Yo ran Christian Family Preschool in Oakland for 13 years and grew a consignment business. She went on to train women entrepreneurs at Women's Initiative for Self Employment, advise owners at the Contra Costa SBDC, and spend 13+ years at Operation HOPE, where she grew from Small Business Coordinator to VP Community Relations to Financial Well-Being Coach.`,
  long: `Yolanda "Yo" Butler is a keynote speaker, podcaster and business strategist based in Antioch, California, serving the San Francisco Bay Area and audiences everywhere virtually. Through her framework, The Business of You, she teaches entrepreneurs how to build a business around their own strengths, story and season of life, blending practical business strategy with mental and financial wellness.

Yo has been an entrepreneur for more than 30 years. She ran Christian Family Preschool in Oakland for 13 years and grew a consignment business alongside it, learning first-hand what it takes to make payroll, earn trust and keep going through hard seasons.

She has spent the years since helping others build. Yo trained women entrepreneurs at Women's Initiative for Self Employment and advised small business owners at the Contra Costa Small Business Development Center. Over more than 13 years at Operation HOPE, she grew from Small Business Coordinator to VP Community Relations to Financial Well-Being Coach, helping families and owners strengthen credit, plan their finances and grow with confidence.

Yo studied Business Administration at California State University, East Bay, where she served as president of the Black Business Association. Today she brings keynotes, workshops and one-on-one coaching to businesses, nonprofits and ministries.`,
};

// Values of the Business of You philosophy
const values = [
  ['Start with the person', 'A business should fit the life of the person building it. We begin with your strengths, story and season.'],
  ['Financial dignity', 'Credit, money management and wealth that lasts. Everyone deserves to understand their money.'],
  ['Each one, reach one', 'Social capital is real capital. When you rise, you reach back and bring someone with you.'],
  ['Wellness is strategy', 'A rested, confident founder makes better decisions. Mental wellness is part of the business plan.'],
];

module.exports = () => {
  const depth = 1, r = rel(depth);
  const bc = crumbs([['About', 'about/']], depth);
  const f = site.facts;

  const body = `
${pageHero({
    eyebrow: 'About Yo',
    title: 'A life spent building, <em>and helping others build.</em>',
    lead: 'Entrepreneur, coach and speaker Yolanda "Yo" Butler on the road that shaped The Business of You.',
    crumbsHtml: bc.html,
  })}

<!-- Story -->
<section class="story sec" aria-labelledby="storyTitle">
  <div class="wrap story-in">
    <figure class="story-portrait reveal">
      <div class="arch arch-light parallax" data-speed="0.05"><img src="${r}images/yolanda.jpg" alt="Yolanda Butler, smiling, wearing statement earrings" width="720" height="720" loading="lazy"/></div>
      <figcaption>Yolanda "Yo" Butler · ${esc(site.person.location)}</figcaption>
    </figure>
    <div class="story-copy prose">
      <p class="eyebrow reveal">Her story</p>
      <h2 class="h2 reveal" id="storyTitle">I know the road, <em>because I've walked it.</em></h2>
      <p class="dropcap reveal">For more than thirty years I've been an entrepreneur. I ran Christian Family Preschool in Oakland for thirteen years and grew a consignment business alongside it. I learned what it takes to make payroll, earn a family's trust and keep the doors open through hard seasons.</p>
      <p class="reveal">Then I spent my career helping other owners do the same. I trained women entrepreneurs at Women's Initiative for Self Employment. I advised small business owners at the Contra Costa SBDC. And over thirteen years at Operation HOPE, I grew from Small Business Coordinator to VP Community Relations to Financial Well-Being Coach.</p>
      <blockquote class="pull reveal">"We build the business around <em>you</em>, not the other way around."</blockquote>
      <p class="reveal">Along the way I saw the same thing again and again: good people with good ideas, held back by money stress, missing connections or a plan that didn't fit their life. The Business of You is my answer. Strategy, financial wellness and community, shaped around the person doing the building.</p>
      <p class="signature reveal">— Yo</p>
    </div>
  </div>
</section>

<!-- Timeline -->
<section class="tl-sec sec dark oxblood grain" aria-labelledby="tlTitle">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow eyebrow-gold reveal">The journey</p>
      <h2 class="h2 reveal" id="tlTitle">Three decades, <em>one mission.</em></h2>
    </div>
    <ol class="tl">
      ${f.timeline.map((t, i) => `<li class="tl-item reveal" style="--d:${i * 90}ms"><span class="tl-label">${esc(t.label)}</span><h3>${esc(t.title)}</h3><p>${esc(t.text)}</p></li>`).join('')}
    </ol>
  </div>
</section>

<!-- Philosophy & values -->
<section class="philo sec" aria-labelledby="philoTitle">
  <div class="wrap">
    <div class="sec-head center">
      <p class="eyebrow reveal">The Business of You™ philosophy</p>
      <h2 class="h2 reveal" id="philoTitle">Four beliefs <em>behind every talk.</em></h2>
    </div>
    <div class="values">
      ${values.map(([t, d], i) => `<article class="value reveal" style="--d:${i * 80}ms"><span class="value-n">${['I', 'II', 'III', 'IV'][i]}</span><h3>${esc(t)}</h3><p>${esc(d)}</p></article>`).join('')}
    </div>
  </div>
</section>

<!-- Pull quote band -->
<section class="quote-band sec dark grain" aria-label="Quote">
  <div class="wrap">
    <blockquote class="big-quote reveal">"Your story, your skills and your relationships are assets. <em>Build on them.</em>"</blockquote>
    <p class="quote-by reveal"><span class="rule"></span>Yolanda Butler</p>
  </div>
</section>

<!-- Bios & headshots -->
<section class="bios sec" id="bios" aria-labelledby="bioTitle">
  <div class="wrap bios-in">
    <div>
      <p class="eyebrow reveal">For event planners &amp; media</p>
      <h2 class="h2 reveal" id="bioTitle">Bios <em>&amp; headshots.</em></h2>
      <p class="reveal">Copy the bio that fits your program, or download it as a text file. The headshot is cleared for event and press use.</p>
      <div class="headshot reveal">
        <img src="${r}images/yolanda.jpg" alt="Headshot of Yolanda Butler" width="120" height="120" loading="lazy"/>
        <div><b>Headshot</b><span>JPG · 720 × 720</span><a class="link-arrow" href="${r}images/yolanda.jpg" download="yolanda-butler-headshot.jpg">Download ${icon('down')}</a></div>
      </div>
      <p class="fine reveal">High-resolution portraits from the upcoming photoshoot will be added here.</p>
    </div>
    <div class="bio-box reveal" data-bios>
      <div class="bio-tabs" role="tablist" aria-label="Bio length">
        <button type="button" role="tab" aria-selected="true" aria-controls="bio-short" id="tab-short">Short <small>${bios.short.split(/\s+/).length} words</small></button>
        <button type="button" role="tab" aria-selected="false" aria-controls="bio-medium" id="tab-medium" tabindex="-1">Medium <small>${bios.medium.split(/\s+/).length} words</small></button>
        <button type="button" role="tab" aria-selected="false" aria-controls="bio-long" id="tab-long" tabindex="-1">Long <small>${bios.long.split(/\s+/).length} words</small></button>
      </div>
      ${Object.entries(bios).map(([k, v], i) => `<div class="bio-panel" role="tabpanel" id="bio-${k}" aria-labelledby="tab-${k}"${i ? ' hidden' : ''}>${v.split('\n\n').map((p) => `<p>${esc(p)}</p>`).join('')}</div>`).join('')}
      <div class="bio-actions"><button type="button" class="btn btn-dark btn-sm js-copy-bio">Copy bio</button><button type="button" class="btn btn-ghost-dark btn-sm js-dl-bio">Download .txt</button><span class="form-msg" aria-live="polite"></span></div>
    </div>
  </div>
</section>

${ctaBand(r, { title: 'Bring Yo <em>to your stage.</em>', lead: 'Keynotes, workshops and panels for businesses, nonprofits and ministries.', primary: ['Book Yo', 'book/'], secondary: ['See her talks', 'speaking/'] })}
`;

  return page({
    path: 'about/', depth, active: 'about/',
    title: 'About Yolanda "Yo" Butler | The Business of You',
    description: 'The story of Yolanda "Yo" Butler: 30+ years as an entrepreneur, 13+ years at Operation HOPE, and the philosophy behind The Business of You.',
    body,
    schema: [
      { '@type': 'AboutPage', '@id': abs('about/#webpage'), url: abs('about/'), name: 'About Yolanda Butler', about: { '@id': ids.person }, mainEntity: { '@id': ids.person } },
      bc.schema,
    ],
  });
};
