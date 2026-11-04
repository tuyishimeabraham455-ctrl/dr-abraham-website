// ============================================================
//  HOME — blueprint section 4 (12 blocks, top to bottom)
// ============================================================
const site = require('../content/site');
const { framework, talks, eventTypes } = require('../content/talks');
const { testimonials } = require('../content/proof');
const { episodes } = require('../content/podcast');
const { page, esc, icon, abs, ids } = require('../lib/layout');
const { quiz, talkCard } = require('../lib/partials');

const sampleTag = (item) => (item.sample ? '<span class="sample" title="Placeholder content to replace">Sample</span>' : '');

module.exports = () => {
  const f = site.facts;

  const body = `
<!-- 1. HERO: cinematic reel (video when available), kinetic headline, two paths -->
<section class="hero grain" aria-labelledby="heroTitle">
  <div class="hero-media" data-reel="assets/video/sizzle.mp4" aria-hidden="true">
    <div class="hero-glow"></div>
  </div>
  <div class="wrap hero-in">
    <div class="hero-copy">
      <p class="eyebrow eyebrow-gold reveal">Keynote Speaker · Podcaster · Business Strategist</p>
      <h1 class="hero-title kinetic" id="heroTitle"><span>Build</span> <span>a</span> <span>business</span> <span>around</span> <em><span>you.</span></em></h1>
      <p class="hero-lead reveal">I'm Yolanda "Yo" Butler. For 30+ years I've built businesses and helped others build theirs, with clear strategy, financial confidence and the right people in your corner.</p>
      <div class="hero-ctas reveal">
        <a class="btn btn-gold magnetic" href="book/">Book Yo ${icon('arrow')}</a>
        <a class="btn btn-ghost magnetic" href="learn/">Start Learning</a>
      </div>
      <dl class="hero-stats reveal">
        <div><dt>Years as an entrepreneur</dt><dd>${f.yearsEntrepreneur}</dd></div>
        <div><dt>Years at Operation HOPE</dt><dd>${f.yearsHope}</dd></div>
        <div><dt>Client recommendations</dt><dd>${f.recommendations}</dd></div>
      </dl>
    </div>
    <figure class="hero-portrait reveal">
      <div class="arch parallax" data-speed="0.06"><img src="images/yolanda.jpg" alt="Portrait of Yolanda Butler" width="720" height="720" fetchpriority="high"/></div>
      <figcaption><span class="rule"></span>Yolanda Butler · ${esc(site.person.location)}</figcaption>
      <button type="button" class="sound-toggle" id="soundToggle" hidden aria-pressed="false">${icon('mute')}<span>Sound off</span></button>
    </figure>
  </div>
  <a class="scroll-cue" href="#meet" aria-label="Scroll to meet Yo"><span></span></a>
</section>

<!-- 2. CREDIBILITY STRIP: real organizations from her career -->
<section class="cred" aria-label="Experience">
  <div class="wrap cred-in">
    <p class="cred-label">A career built alongside</p>
    <ul class="cred-list">${f.organizations.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
  </div>
</section>

<!-- 3. MEET YO -->
<section class="meet sec" id="meet" aria-labelledby="meetTitle">
  <div class="wrap meet-in">
    <div class="meet-num-wrap reveal"><div class="meet-num" aria-hidden="true">30<sup>+</sup></div><p class="meet-num-cap">Years building businesses</p></div>
    <div class="meet-copy">
      <p class="eyebrow reveal">Meet Yo</p>
      <h2 class="h2 reveal" id="meetTitle">I know the road, <em>because I've walked it.</em></h2>
      <p class="reveal">I ran Christian Family Preschool in Oakland for 13 years and grew a consignment business on the side. Then I spent my career helping other owners: training women entrepreneurs, advising at the Contra Costa SBDC, and growing from Small Business Coordinator to Financial Well-Being Coach at Operation HOPE.</p>
      <p class="reveal">Today I bring that experience to stages, workshops and one-on-one coaching for businesses, nonprofits and ministries. My promise is simple: we build the business around <em>you</em>, not the other way around.</p>
      <p class="signature reveal">— Yo</p>
      <a class="link-arrow reveal" href="about/">Read my story ${icon('arrow')}</a>
    </div>
  </div>
</section>

<!-- 4. THE BUSINESS OF YOU FRAMEWORK -->
<section class="framework sec dark oxblood grain" aria-labelledby="fwTitle">
  <div class="wrap">
    <div class="sec-head">
      <p class="eyebrow eyebrow-gold reveal">The framework</p>
      <h2 class="h2 reveal" id="fwTitle">The Business of You, <em>in five steps.</em></h2>
      <p class="lead reveal">A clear path from idea to impact. Every step connects to a talk, an episode or a resource.</p>
    </div>
    <ol class="fw-grid">
      ${framework.map((s, i) => `<li class="fw-card reveal" style="--d:${i * 80}ms">
        <span class="fw-n">${s.n}</span>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.text)}</p>
        <a href="speaking/${s.talk}/" class="fw-link">Related talk ${icon('arrow')}</a>
      </li>`).join('')}
    </ol>
  </div>
</section>

<!-- 5. SPEAKING TOPICS + FIND YOUR TALK -->
<section class="topics sec" id="speaking" aria-labelledby="topicsTitle">
  <div class="wrap">
    <div class="sec-head split">
      <div>
        <p class="eyebrow reveal">Speaking</p>
        <h2 class="h2 reveal" id="topicsTitle">Talks that leave rooms <em>ready to build.</em></h2>
      </div>
      <a class="link-arrow reveal" href="speaking/">All talks and workshops ${icon('arrow')}</a>
    </div>
    <div class="talk-grid">
      ${talks.map((t, i) => talkCard(t, i, './')).join('')}
    </div>

    ${quiz()}
  </div>
</section>

<!-- 6. WELLNESS PILLARS: three luxe panels -->
<section class="pillars sec dark grain" aria-labelledby="pillarsTitle">
  <div class="wrap">
    <div class="sec-head center">
      <p class="eyebrow eyebrow-gold reveal">Whole-founder wellness</p>
      <h2 class="h2 reveal" id="pillarsTitle">A business is only as strong as <em>the person behind it.</em></h2>
    </div>
    <div class="pillar-grid">
      <article class="pillar reveal" style="--d:0ms"><span class="pillar-ic">${icon('mind')}</span><p class="pillar-n">I</p><h3>Mental wellness</h3><p>Confidence, boundaries and stress habits that keep founders steady through every season.</p></article>
      <article class="pillar reveal featured" style="--d:100ms"><span class="pillar-ic">${icon('coin')}</span><p class="pillar-n">II</p><h3>Financial wellness</h3><p>Credit, planning and trust accounts. The money foundations that protect what you build.</p></article>
      <article class="pillar reveal" style="--d:200ms"><span class="pillar-ic">${icon('build')}</span><p class="pillar-n">III</p><h3>Business building</h3><p>Plans, funding and access to markets, shaped around your strengths and your life.</p></article>
    </div>
  </div>
</section>

<!-- 7. PROOF: testimonials, key stats, event types -->
<section class="proof sec" aria-labelledby="proofTitle">
  <div class="wrap">
    <div class="sec-head center">
      <p class="eyebrow reveal">Proof</p>
      <h2 class="h2 reveal" id="proofTitle">What people say <em>after the room empties.</em></h2>
    </div>
    <div class="carousel reveal" id="testi" aria-roledescription="carousel" aria-label="Testimonials">
      <div class="car-track">
        ${testimonials.map((t, i) => `<figure class="car-slide${i === 0 ? ' on' : ''}" aria-roledescription="slide" aria-label="${i + 1} of ${testimonials.length}"${i ? ' aria-hidden="true"' : ''}>
          <span class="car-q" aria-hidden="true">&ldquo;</span>
          <blockquote>${esc(t.quote)}</blockquote>
          <figcaption><b>${esc(t.name)}</b> · ${esc(t.role)} ${sampleTag(t)}</figcaption>
        </figure>`).join('')}
      </div>
      <div class="car-nav"><button type="button" class="car-btn" data-dir="-1" aria-label="Previous testimonial">${icon('arrow')}</button><span class="car-dots">${testimonials.map((_, i) => `<button type="button" aria-label="Show testimonial ${i + 1}"${i === 0 ? ' aria-current="true"' : ''}></button>`).join('')}</span><button type="button" class="car-btn" data-dir="1" aria-label="Next testimonial">${icon('arrow')}</button></div>
    </div>
    <div class="proof-row">
      <dl class="big-stats">
        <div class="reveal"><dd>${f.yearsEntrepreneur}</dd><dt>years building businesses</dt></div>
        <div class="reveal" style="--d:80ms"><dd>${f.yearsPreschool}</dd><dt>years running her own preschool</dt></div>
        <div class="reveal" style="--d:160ms"><dd>${f.recommendations}</dd><dt>written recommendations from clients and peers</dt></div>
      </dl>
      <div class="served reveal"><p class="eyebrow">Event types served</p><ul>${eventTypes.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></div>
    </div>
  </div>
</section>

<!-- 8. PODCAST / SHOW TEASER -->
<section class="pod sec dark oxblood grain" aria-labelledby="podTitle">
  <div class="wrap pod-in">
    <div>
      <p class="eyebrow eyebrow-gold reveal">The podcast · coming soon</p>
      <h2 class="h2 reveal" id="podTitle">Conversations about building <em>the business of you.</em></h2>
      <p class="lead reveal">Founders, lenders and community builders on money, mindset and growth. Join the launch list and be first to hear episode one.</p>
      <div class="hero-ctas reveal"><a class="btn btn-gold magnetic" href="podcast/">Explore the show</a><a class="btn btn-ghost magnetic" href="podcast/be-a-guest/">Be a guest</a></div>
    </div>
    <ul class="ep-list">
      ${episodes.slice(0, 3).map((e, i) => `<li class="ep reveal" style="--d:${i * 90}ms">
        <a class="ep-play" href="podcast/${e.slug}/" aria-label="Episode ${e.n}: ${esc(e.title)}">${icon('play')}</a>
        <div><p class="ep-meta">Episode ${e.n} · ${esc(e.topic)} · ${e.minutes} min ${sampleTag(e)}</p><h3><a href="podcast/${e.slug}/">${esc(e.title)}</a></h3><p class="ep-guest">${esc(e.guest)}</p></div>
      </li>`).join('')}
    </ul>
  </div>
</section>

<!-- 9. AGENT YO SPOTLIGHT -->
<section class="spot sec" aria-labelledby="spotTitle">
  <div class="wrap spot-in">
    <div class="spot-copy">
      <p class="eyebrow reveal">Meet Agent Yo</p>
      <h2 class="h2 reveal" id="spotTitle">Ask Agent Yo. <em>Get your next step.</em></h2>
      <p class="reveal">Agent Yo is Yolanda's AI concierge. It helps event planners find the right talk, helps founders test an idea, and routes partners to the right person. Friendly, private and always clear that it's an AI.</p>
      <ul class="ticks reveal"><li>${icon('check')}Plans your event and pre-fills the booking form</li><li>${icon('check')}Points you to the right free resource</li><li>${icon('check')}Hands off to a real person whenever you want</li></ul>
    </div>
    <div class="spot-demo reveal" role="group" aria-label="Sample questions for Agent Yo">
      <div class="spot-msg bot"><span class="agent-ava">Yo</span><p>Hi! What are you working on today?</p></div>
      <div class="spot-prompts">
        <button type="button" class="prompt js-ask" data-mode="planner">Plan a keynote for my conference</button>
        <button type="button" class="prompt js-ask" data-mode="builder">Is my business idea a real problem?</button>
        <button type="button" class="prompt js-ask" data-mode="builder">How do I start building business credit?</button>
        <button type="button" class="prompt js-ask" data-mode="partner">I'd like to be a guest on the podcast</button>
      </div>
    </div>
  </div>
</section>

<!-- 10. LEAD MAGNET -->
<section class="magnet sec blush" aria-labelledby="magTitle">
  <div class="wrap magnet-in">
    <div class="book-mock reveal" aria-hidden="true"><span class="bm-k">Free workbook</span><span class="bm-t">The Business <em>of</em> You</span><span class="bm-s">Is my idea a real problem?</span><span class="bm-a">Yolanda Butler</span></div>
    <div>
      <p class="eyebrow reveal">Free workbook</p>
      <h2 class="h2 reveal" id="magTitle">Is your idea <em>a real problem?</em></h2>
      <p class="reveal">A short, guided workbook to test your idea, map your strengths and choose your first step. The same questions Yo asks every new client.</p>
      <form class="inline-form big reveal js-sub" data-source="workbook">
        <label class="sr" for="magEmail">Email address</label>
        <input id="magEmail" name="email" type="email" placeholder="Your best email" required autocomplete="email"/>
        <button class="btn btn-dark magnetic">Send me the workbook</button>
      </form>
      <p class="form-msg" aria-live="polite"></p>
      <p class="fine">No spam. Unsubscribe in one click.</p>
    </div>
  </div>
</section>

<!-- 11. FINAL CTA + BOOKING FORM -->
<section class="final sec dark grain" id="book" aria-labelledby="finalTitle">
  <div class="wrap final-in">
    <div>
      <p class="eyebrow eyebrow-gold reveal">Book Yo</p>
      <h2 class="h2 big reveal" id="finalTitle">Let's build something <em>around you.</em></h2>
      <p class="lead reveal">Keynotes, workshops, panels and coaching for businesses, nonprofits and ministries, in person across the Bay Area or virtually anywhere.</p>
      <p class="reveal final-alt">Prefer the full planner? <a href="book/">Use the step-by-step booking form</a>.</p>
    </div>
    <form class="card-form reveal" id="quickBook" novalidate>
      <div class="row2">
        <div class="field"><label for="qbName">Your name</label><input id="qbName" name="name" required autocomplete="name"/></div>
        <div class="field"><label for="qbEmail">Email</label><input id="qbEmail" name="email" type="email" required autocomplete="email"/></div>
      </div>
      <div class="row2">
        <div class="field"><label for="qbOrg">Organization</label><input id="qbOrg" name="organization" autocomplete="organization"/></div>
        <div class="field"><label for="qbDate">Event date</label><input id="qbDate" name="event_date" type="date"/></div>
      </div>
      <div class="field"><label for="qbType">What are you planning?</label>
        <select id="qbType" name="event_type"><option>Keynote</option><option>Workshop or training</option><option>Panel or fireside chat</option><option>Coaching</option><option>Something else</option></select></div>
      <div class="field"><label for="qbMsg">Tell us about your audience</label><textarea id="qbMsg" name="message" rows="3" required></textarea></div>
      <div class="hp" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"/></label></div>
      <label class="consent"><input type="checkbox" name="consent" required/><span>I agree to be contacted about my inquiry. See the <a href="privacy/">privacy policy</a>.</span></label>
      <button class="btn btn-gold btn-block magnetic">Send my inquiry ${icon('arrow')}</button>
      <p class="form-msg" aria-live="polite"></p>
    </form>
  </div>
</section>
`;

  return page({
    path: '',
    depth: 0,
    title: 'Yolanda Butler | Business Speaker & Strategist',
    description: 'Keynote speaker and business strategist Yolanda "Yo" Butler helps founders build a business around themselves with strategy and financial wellness.',
    bodyClass: 'home',
    body,
    schema: [
      { '@type': 'WebPage', '@id': abs('#webpage'), url: abs(), name: 'The Business of You with Yolanda Butler', about: { '@id': ids.person }, isPartOf: { '@id': ids.website } },
    ],
  });
};
