// ============================================================
//  Shared layout: <head> (SEO + JSON-LD), header, footer,
//  Agent Yo launcher, cookie notice and the icon sprite.
// ============================================================
const site = require('../content/site');

// HTML-escape text that goes into markup or attributes
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Absolute URL for canonical / Open Graph / schema
const abs = (path = '') => site.url.replace(/\/$/, '') + '/' + String(path).replace(/^\//, '');

// Stable schema @id values so every page points at the same entities
const ids = { person: abs('#yo'), org: abs('#organization'), website: abs('#website') };

const personSchema = () => ({
  '@type': 'Person',
  '@id': ids.person,
  name: site.person.name,
  alternateName: site.person.nickname,
  jobTitle: site.person.jobTitle,
  description: site.person.oneLine,
  url: abs(),
  image: abs(site.person.image),
  alumniOf: { '@type': 'CollegeOrUniversity', name: site.person.alumniOf },
  knowsAbout: site.person.knowsAbout,
  homeLocation: { '@type': 'Place', name: site.person.location },
  sameAs: site.social.map((s) => s.url),
});

const baseSchema = () => [
  { '@type': 'WebSite', '@id': ids.website, url: abs(), name: `${site.brand} with ${site.person.name}`, publisher: { '@id': ids.org } },
  {
    '@type': 'ProfessionalService', '@id': ids.org, name: site.brand, url: abs(), image: abs(site.person.image),
    founder: { '@id': ids.person }, areaServed: site.person.area, address: { '@type': 'PostalAddress', addressLocality: 'Antioch', addressRegion: 'CA', addressCountry: 'US' },
  },
];

// Icon sprite (stroke icons, 24px grid)
const ICONS = {
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  sound: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  send: '<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  pin: '<path d="M12 22s7-6.5 7-12a7 7 0 0 0-14 0c0 5.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  mind: '<path d="M9 21v-3a6 6 0 1 1 7-5.9V14l2 3h-2v2a2 2 0 0 1-2 2zM10 9a2 2 0 0 1 4 0c0 1.5-2 2-2 3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/>',
  build: '<path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6M9 11h.01M15 11h.01"/>',
  quote: '<path d="M7 7h4v4c0 3-1.5 5-4 6M15 7h4v4c0 3-1.5 5-4 6" />',
  ig: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r=".9" fill="currentColor"/>',
  li: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10v7M8 7v.01M12 17v-4a2 2 0 0 1 4 0v4M12 10v7"/>',
  yt: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9v6l5-3z" fill="currentColor"/>',
  fb: '<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V10H6v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h2z"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/>',
  ticket: '<path d="M3 8a2 2 0 0 0 0 4 2 2 0 0 1 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 0 0-4V6H3z"/><path d="M14 6v12" stroke-dasharray="2 2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  file: '<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 13h6M9 17h6"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
};

// ---------- Helpers for inner pages ----------
// Relative prefix for a page `depth` folders deep
const rel = (depth) => (depth ? '../'.repeat(depth) : './');

// Breadcrumbs: visible trail + BreadcrumbList schema. items = [[label, path], ...] (last item = current page)
const crumbs = (items, depth) => {
  const r = rel(depth);
  const html = `<nav class="crumbs" aria-label="Breadcrumb"><ol><li><a href="${r}">Home</a></li>${items.map(([label, p], i) =>
    i === items.length - 1 ? `<li aria-current="page">${esc(label)}</li>` : `<li><a href="${r}${p}">${esc(label)}</a></li>`).join('')}</ol></nav>`;
  const schema = { '@type': 'BreadcrumbList', itemListElement: [['Home', ''], ...items].map(([label, p], i) => ({ '@type': 'ListItem', position: i + 1, name: label, item: abs(p) })) };
  return { html, schema };
};

// Inner-page hero (dark, editorial)
const pageHero = ({ eyebrow, title, lead, crumbsHtml = '', extra = '', tone = '', mark = 'Yo' }) => `
<section class="phero grain ${tone}">
  <span class="phero-mark" aria-hidden="true">${mark}</span>
  <div class="wrap">
    ${crumbsHtml}
    <p class="eyebrow eyebrow-gold reveal">${eyebrow}</p>
    <h1 class="phero-title kinetic-soft">${title}</h1>
    ${lead ? `<p class="phero-lead reveal">${lead}</p>` : ''}
    ${extra}
  </div>
</section>`;

// FAQ block (native <details>) + FAQPage schema
const faqBlock = (faqs, heading = 'Questions, <em>answered.</em>') => ({
  html: `<section class="faq sec" aria-labelledby="faqTitle"><div class="wrap faq-in">
    <div><p class="eyebrow reveal">FAQ</p><h2 class="h2 reveal" id="faqTitle">${heading}</h2></div>
    <div class="faq-list">${faqs.map(([q, a]) => `<details class="reveal"><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
  </div></section>`,
  schema: { '@type': 'FAQPage', mainEntity: faqs.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
});

const sampleTag = (item) => (item && item.sample ? '<span class="sample" title="Placeholder content to replace">Sample</span>' : '');
const sprite = () => `<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>${Object.entries(ICONS).map(([k, v]) => `<symbol id="i-${k}" viewBox="0 0 24 24">${v}</symbol>`).join('')}</defs></svg>`;
const icon = (name, cls = '') => `<svg class="ic ${cls}" aria-hidden="true"><use href="#i-${name}"/></svg>`;

// The page wrapper. `depth` = how many folders deep the page lives (for relative links).
function page({ path = '', depth = 0, title, description, body, schema = [], active = '', ogImage, bodyClass = '', scripts = [], noindex = false }) {
  const r = depth ? '../'.repeat(depth) : './';
  const href = (p) => r + p;
  if (title.length > 60) console.warn(`  ! title over 60 chars (${title.length}): ${title}`);
  if (description.length > 155) console.warn(`  ! description over 155 chars (${description.length}): ${path}`);

  const graph = { '@context': 'https://schema.org', '@graph': [...baseSchema(), personSchema(), ...schema] };
  const canonical = abs(path);
  const og = abs(ogImage || site.person.image);
  const favicon = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2A1A16"/><text x="32" y="43" font-family="Georgia,serif" font-size="30" font-style="italic" fill="#C9A66B" text-anchor="middle">Yo</text></svg>');

  const nav = site.nav.map((n) => `<a href="${href(n.href)}"${active === n.href ? ' aria-current="page"' : ''}>${esc(n.label)}</a>`).join('');

  return `<!doctype html>
<html lang="en" class="no-js">
<head>
<meta charset="utf-8"/>
<script>document.documentElement.className="js"</script>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}"/>
<link rel="canonical" href="${canonical}"/>${noindex ? '\n<meta name="robots" content="noindex, follow"/>' : ''}
<meta name="theme-color" content="#2A1A16"/>
<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${esc(site.brand)}"/>
<meta property="og:title" content="${esc(title)}"/>
<meta property="og:description" content="${esc(description)}"/>
<meta property="og:url" content="${canonical}"/>
<meta property="og:image" content="${og}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" href="${favicon}"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap"/>
<link rel="stylesheet" href="${href('assets/css/yo.css')}"/>
<script type="application/ld+json">${JSON.stringify(graph).replace(/</g, '\\u003c')}</script>
</head>
<body class="${bodyClass}" data-root="${r}">
${sprite()}
<a class="skip" href="#main">Skip to content</a>

<header class="hdr" id="hdr">
  <div class="wrap hdr-in">
    <a class="logo" href="${href('')}" aria-label="${esc(site.brand)}, home">
      <span class="logo-mark">Yo</span>
      <span class="logo-word">The Business <em>of</em> You</span>
    </a>
    <nav class="nav" aria-label="Main">${nav}</nav>
    <div class="hdr-cta">
      <button class="agent-chip js-agent-open" type="button">${icon('spark')}<span>Agent Yo</span></button>
      <a class="btn btn-gold btn-sm magnetic" href="${href('book/')}">Book Yo</a>
      <button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="mnav">${icon('menu')}</button>
    </div>
  </div>
</header>

<div class="mnav" id="mnav" hidden>
  <nav aria-label="Mobile">${site.nav.map((n) => `<a href="${href(n.href)}">${esc(n.label)}</a>`).join('')}
    <a href="${href('book/')}" class="btn btn-gold">Book Yo</a>
  </nav>
</div>

<main id="main">
${body}
</main>

<footer class="ftr grain">
  <div class="wrap">
    <div class="ftr-top">
      <div class="ftr-brand">
        <a class="logo logo-light" href="${href('')}"><span class="logo-mark">Yo</span><span class="logo-word">The Business <em>of</em> You</span></a>
        <p>${esc(site.person.oneLine)}</p>
        <div class="social">${site.social.map((s) => `<a href="${esc(s.url)}" aria-label="${esc(s.name)}" rel="noopener" target="_blank">${icon(s.icon)}</a>`).join('')}</div>
      </div>
      <div class="ftr-col"><h3>Work with Yo</h3>
        <a href="${href('book/')}">Book Yo</a><a href="${href('speaking/')}">Speaking</a><a href="${href('press/')}">Press kit</a><a href="${href('contact/')}">Contact</a>
      </div>
      <div class="ftr-col"><h3>Learn</h3>
        <a href="${href('podcast/')}">Podcast &amp; Show</a><a href="${href('learn/')}">Training</a><a href="${href('blog/')}">Insights</a><a href="${href('events/')}">Events</a><a href="${href('search/')}">Search</a>
      </div>
      <form class="ftr-news js-sub" data-source="footer">
        <h3>The Sunday Letter</h3>
        <p>One idea for your business and your wellbeing, every Sunday.</p>
        <label class="sr" for="fnews">Email address</label>
        <div class="inline-form"><input id="fnews" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-gold btn-sm">Join</button></div>
        <p class="form-msg" aria-live="polite"></p>
      </form>
    </div>
    <div class="ftr-bottom">
      <p>&copy; ${new Date().getFullYear()} ${esc(site.brand)} · ${esc(site.person.name)} · ${esc(site.person.location)}</p>
      <nav aria-label="Legal"><a href="${href('privacy/')}">Privacy</a><a href="${href('terms/')}">Terms</a><a href="${href('ai-disclosure/')}">AI use</a><a href="${href('accessibility/')}">Accessibility</a><a href="${href('disclaimer/')}">Disclaimer</a><button type="button" class="linkish js-cookie-prefs">Cookie preferences</button></nav>
    </div>
    <p class="ftr-note">Education, not financial, legal or mental health advice. For personal guidance, please consult a licensed professional.</p>
  </div>
</footer>

<!-- Agent Yo: persistent launcher -->
<div class="agent" id="agent">
  <div class="agent-bubble" id="agentBubble" hidden>
    <button type="button" class="agent-bubble-x" aria-label="Dismiss">${icon('x')}</button>
    <p><b>Hi, I'm Agent Yo.</b> Planning an event or building a business? I can point you to the right next step.</p>
  </div>
  <button type="button" class="agent-fab js-agent-open" aria-label="Chat with Agent Yo" aria-controls="agentPanel">
    <span class="agent-ava">Yo</span><span class="agent-pulse" aria-hidden="true"></span>
  </button>
  <section class="agent-panel" id="agentPanel" role="dialog" aria-modal="false" aria-labelledby="agentTitle" hidden>
    <header class="agent-head">
      <span class="agent-ava">Yo</span>
      <div><h2 id="agentTitle">Agent Yo</h2><p>AI assistant · Education, not advice</p></div>
      <button type="button" class="agent-x js-agent-close" aria-label="Close chat">${icon('x')}</button>
    </header>
    <div class="agent-log" id="agentLog" aria-live="polite"></div>
    <form class="agent-input" id="agentForm">
      <label class="sr" for="agentText">Message Agent Yo</label>
      <input id="agentText" autocomplete="off" placeholder="Type a message…" maxlength="600"/>
      <button aria-label="Send">${icon('send')}</button>
    </form>
    <p class="agent-fine">I'm an AI assistant for ${esc(site.person.name)}. I share education, not financial, legal or mental health advice. <a href="${href('ai-disclosure/')}">How I work</a> · <button type="button" class="linkish js-agent-forget">Forget this chat</button></p>
  </section>
</div>

<!-- Cookie notice -->
<div class="cookie" id="cookie" hidden>
  <p>We use a small privacy-friendly analytics cookie to understand which pages help people most. No ads, no selling data.</p>
  <div><button type="button" class="btn btn-sm btn-ghost-dark" data-consent="no">Decline</button><button type="button" class="btn btn-sm btn-dark" data-consent="yes">Accept</button></div>
</div>

<script src="${href('assets/js/yo.js')}" defer></script>
${scripts.map((sc) => `<script src="${href(sc)}" defer></script>`).join('\n')}
</body>
</html>
`;
}

module.exports = { page, esc, abs, icon, ids, personSchema, rel, crumbs, pageHero, faqBlock, sampleTag };
