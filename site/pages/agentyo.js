// ============================================================
//  AGENT YO (dedicated page) — full-screen chat, modes,
//  suggested prompts, how it works, privacy & AI disclosure
// ============================================================
const { page, esc, icon, abs, ids, rel, crumbs, pageHero } = require('../lib/layout');

const MODES = [
  ['planner', 'cal', 'Planning an event', 'Find the right keynote or workshop, see open call times, and send your details to Yo\'s team.', ['Plan a keynote for my conference', 'Which talk fits a nonprofit audience?', 'What does a discovery call cover?']],
  ['builder', 'spark', 'Building a business', 'Test whether your idea solves a real problem and find your next step.', ['Is my business idea a real problem?', 'How do I start building business credit?', 'How do I become a paid speaker?']],
  ['partner', 'users', 'Guest, sponsor or press', 'Get routed to the right form and the right person on the team.', ['I\'d like to be a guest on the podcast', 'We want to sponsor the show', 'I\'m a journalist writing a story']],
];

module.exports = () => {
  const depth = 1, r = rel(depth), path = 'agent-yo/';
  const bc = crumbs([['Agent Yo', path]], depth);

  const body = `
${pageHero({ mark: 'AI', eyebrow: 'Agent Yo', title: 'Your concierge to <em>the Business of You.</em>', lead: 'Ask Agent Yo to plan an event, test a business idea or reach the right person. It answers from Yolanda\'s own material and hands off to a human whenever you like.', crumbsHtml: bc.html })}

<section class="sec agent-page" aria-label="Chat with Agent Yo">
  <div class="wrap agent-page-in">
    <div class="agent-modes">
      ${MODES.map(([m, ic, t, d, prompts], i) => `<article class="mode-card reveal" style="--d:${i * 80}ms">
        <span class="asset-ic">${icon(ic)}</span>
        <h2 class="h3">${esc(t)}</h2>
        <p>${esc(d)}</p>
        <div class="mode-prompts">${prompts.map((p) => `<button type="button" class="prompt-lite js-ask" data-mode="${m}">${esc(p)}</button>`).join('')}</div>
      </article>`).join('')}
      <div class="handoffs reveal">
        <p class="eyebrow">Prefer a person?</p>
        <div class="hero-ctas"><a class="btn btn-dark btn-sm" href="${r}book/">Book Yo</a><a class="btn btn-ghost-dark btn-sm" href="${r}press/one-sheet/">Download one-sheet</a><a class="btn btn-ghost-dark btn-sm" href="${r}learn/#community">Join the waitlist</a></div>
      </div>
    </div>
    <div class="agent-dock" data-agent-dock aria-label="Agent Yo chat"></div>
  </div>
</section>

<section class="sec dark grain" aria-labelledby="howTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow eyebrow-gold reveal">How it works</p><h2 class="h2 reveal" id="howTitle">Helpful, honest <em>and private.</em></h2></div>
    <div class="values">
      <article class="value reveal"><span class="value-n">I</span><h3>Yolanda's own material</h3><p>Agent Yo answers from Yo's bio, talks, workshops and FAQs. If it doesn't know, it says so and offers a person.</p></article>
      <article class="value reveal" style="--d:80ms"><span class="value-n">II</span><h3>Always an AI</h3><p>It's an AI assistant, not Yolanda. It shares education, not financial, legal or mental health advice.</p></article>
      <article class="value reveal" style="--d:160ms"><span class="value-n">III</span><h3>You're in control</h3><p>It only sends your details to the team after you say yes. You can delete your conversation any time.</p></article>
      <article class="value reveal" style="--d:240ms"><span class="value-n">IV</span><h3>Never sold</h3><p>Conversations are used only to help you and improve answers. They are never sold or shared for advertising.</p></article>
    </div>
    <p class="reveal" style="margin-top:2.4rem"><a class="link-arrow" href="${r}ai-disclosure/">Read the AI use disclosure ${icon('arrow')}</a></p>
  </div>
</section>
`;

  return page({
    path, depth, active: '',
    title: 'Agent Yo | AI Concierge for The Business of You',
    description: 'Chat with Agent Yo, the AI concierge for Yolanda "Yo" Butler: plan an event, test a business idea or reach the right person on her team.',
    body, bodyClass: 'page-agent',
    schema: [{ '@type': 'WebPage', '@id': abs('agent-yo/#webpage'), url: abs(path), name: 'Agent Yo', about: { '@id': ids.person } }, bc.schema],
  });
};
