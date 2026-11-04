// ============================================================
//  Reusable page sections (used on several pages)
// ============================================================
const { esc, icon } = require('./layout');

// "Find your talk" quiz (logic lives in assets/js/yo.js)
const quiz = () => `
<div class="quiz reveal" id="quiz" aria-labelledby="quizTitle">
  <div class="quiz-intro">
    <p class="eyebrow">Find your talk</p>
    <h3 id="quizTitle">Three questions. <em>Your perfect fit.</em></h3>
    <p>Tell us about your audience and we'll match you with the right keynote or workshop.</p>
  </div>
  <form class="quiz-body" id="quizForm">
    <fieldset data-step="1"><legend>Who is your audience?</legend>
      <div class="chips"><label><input type="radio" name="aud" value="Corporate"/><span>Corporate team</span></label><label><input type="radio" name="aud" value="Nonprofit"/><span>Nonprofit or ministry</span></label><label><input type="radio" name="aud" value="Conference"/><span>Conference</span></label><label><input type="radio" name="aud" value="Women's groups"/><span>Women's group</span></label></div>
    </fieldset>
    <fieldset data-step="2" hidden><legend>What should they walk away with?</legend>
      <div class="chips"><label><input type="radio" name="goal" value="business-of-you"/><span>A business idea they believe in</span></label><label><input type="radio" name="goal" value="credit-capital-confidence"/><span>Money and credit confidence</span></label><label><input type="radio" name="goal" value="each-one-reach-one"/><span>Stronger relationships and community</span></label></div>
    </fieldset>
    <fieldset data-step="3" hidden><legend>What format works best?</legend>
      <div class="chips"><label><input type="radio" name="fmt" value="Keynote"/><span>Keynote</span></label><label><input type="radio" name="fmt" value="Workshop"/><span>Hands-on workshop</span></label><label><input type="radio" name="fmt" value="Panel"/><span>Panel or fireside chat</span></label><label><input type="radio" name="fmt" value="Virtual"/><span>Virtual</span></label></div>
    </fieldset>
    <div class="quiz-result" id="quizResult" hidden aria-live="polite"></div>
    <div class="quiz-foot"><span class="quiz-dots" aria-hidden="true"><i class="on"></i><i></i><i></i></span><button type="button" class="linkish" id="quizBack" hidden>Back</button></div>
  </form>
</div>`;

// Keynote card. r = relative prefix to the site root.
const talkCard = (t, i, r, extraAttrs = '') => `<article class="talk reveal" style="--d:${i * 90}ms" ${extraAttrs}>
  <span class="talk-n">0${i + 1}</span>
  <p class="talk-kind">${esc(t.kind)} · ${esc(t.length)}</p>
  <h3><a href="${r}speaking/${t.slug}/">${esc(t.title)}</a></h3>
  <p class="talk-sub">${esc(t.subtitle)}</p>
  <ul class="ticks">${t.takeaways.slice(0, 3).map((k) => `<li>${icon('check')}${esc(k)}</li>`).join('')}</ul>
  <a class="link-arrow" href="${r}speaking/${t.slug}/">Explore this talk ${icon('arrow')}</a>
</article>`;

// Closing call to action used at the bottom of inner pages
const ctaBand = (r, { title = 'Let\'s build something <em>around you.</em>', lead = 'Tell us about your event or your goals. Yo\'s team replies within one business day.', primary = ['Book Yo', 'book/'], secondary = ['Ask Agent Yo', null] } = {}) => `
<section class="cta-band sec dark grain">
  <div class="wrap cta-in">
    <h2 class="h2 big reveal">${title}</h2>
    <p class="lead reveal">${lead}</p>
    <div class="hero-ctas reveal">
      <a class="btn btn-gold magnetic" href="${r}${primary[1]}">${esc(primary[0])} ${icon('arrow')}</a>
      ${secondary[1] ? `<a class="btn btn-ghost magnetic" href="${r}${secondary[1]}">${esc(secondary[0])}</a>` : `<button type="button" class="btn btn-ghost magnetic js-agent-open">${esc(secondary[0])}</button>`}
    </div>
  </div>
</section>`;

module.exports = { quiz, talkCard, ctaBand };
