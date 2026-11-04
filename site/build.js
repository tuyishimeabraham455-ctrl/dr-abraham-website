// ============================================================
//  Static site builder (no dependencies).
//  Run:  node site/build.js
//  Output: docs/  (served by GitHub Pages and by server.js)
// ============================================================
const fs = require('fs');
const path = require('path');
const site = require('./content/site');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'docs');

const { talks } = require('./content/talks');
const { episodes } = require('./content/podcast');
const { programs, resources } = require('./content/learn');
const { posts } = require('./content/posts');

// Every page: route (folder path), a render function returning HTML, sitemap priority
const mod = (m, ...args) => () => { delete require.cache[require.resolve(m)]; return require(m)(...args); };
const PAGES = [
  { route: '', render: mod('./pages/home'), priority: '1.0' },
  { route: 'about/', render: mod('./pages/about'), priority: '0.9' },
  { route: 'speaking/', render: mod('./pages/speaking'), priority: '0.9' },
  ...talks.map((t) => ({ route: `speaking/${t.slug}/`, render: mod('./pages/talk', t.slug), priority: '0.8' })),
  { route: 'speaking/workshops/', render: mod('./pages/workshops'), priority: '0.7' },
  { route: 'speaking/corporate-nonprofit/', render: mod('./pages/corporate'), priority: '0.8' },
  { route: 'book/', render: mod('./pages/book'), priority: '0.9' },
  { route: 'press/', render: mod('./pages/press'), priority: '0.7' },
  { route: 'press/one-sheet/', render: mod('./pages/onesheet'), priority: '0.6' },
  { route: 'contact/', render: mod('./pages/contact'), priority: '0.6' },
  { route: 'agent-yo/', render: mod('./pages/agentyo'), priority: '0.7' },
  { route: 'podcast/', render: mod('./pages/podcast'), priority: '0.8' },
  ...episodes.map((e) => ({ route: `podcast/${e.slug}/`, render: mod('./pages/episode', e.slug), priority: e.sample ? '0.4' : '0.7' })),
  { route: 'podcast/be-a-guest/', render: () => require('./pages/showpages').guest(), priority: '0.6' },
  { route: 'podcast/the-show/', render: () => require('./pages/showpages').show(), priority: '0.6' },
  { route: 'podcast/sponsor/', render: () => require('./pages/showpages').sponsor(), priority: '0.6' },
  { route: 'learn/', render: () => require('./pages/learn').hub(), priority: '0.8' },
  ...programs.map((p) => ({ route: `learn/${p.slug}/`, render: () => require('./pages/learn').program(p.slug), priority: '0.7' })),
  ...resources.map((x) => ({ route: `learn/${x.slug}/`, render: () => require('./pages/learn').resource(x.slug), priority: '0.6' })),
  { route: 'learn/community/', render: () => require('./pages/learn').community(), priority: '0.5' },
  { route: 'blog/', render: () => require('./pages/blog').index(), priority: '0.7' },
  ...posts.map((p) => ({ route: `blog/${p.slug}/`, render: () => require('./pages/blog').post(p.slug), priority: '0.7' })),
  { route: 'events/', render: mod('./pages/events'), priority: '0.6' },
  { route: 'privacy/', render: () => require('./pages/legal').privacy(), priority: '0.3' },
  { route: 'terms/', render: () => require('./pages/legal').terms(), priority: '0.3' },
  { route: 'ai-disclosure/', render: () => require('./pages/legal').aiDisclosure(), priority: '0.4' },
  { route: 'accessibility/', render: () => require('./pages/legal').accessibility(), priority: '0.3' },
  { route: 'disclaimer/', render: () => require('./pages/legal').disclaimer(), priority: '0.3' },
  { route: 'search/', render: mod('./pages/search'), priority: '0', noindex: true },
  { route: 'portal/', render: mod('./pages/portal'), priority: '0', noindex: true },
  { route: '', file: '404.html', render: mod('./pages/notfound'), priority: '0', noindex: true },
  { route: 'offline/', render: mod('./pages/offline'), priority: '0', noindex: true },
];

// Section label for search results, from the first folder of the route
const SECTIONS = { '': 'Home', about: 'About', speaking: 'Speaking', book: 'Book Yo', press: 'Press', contact: 'Contact', 'agent-yo': 'Agent Yo', podcast: 'Podcast', learn: 'Learn', blog: 'Insights', events: 'Events' };
const decode = (s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
const searchEntry = (p, html) => {
  const title = decode((html.match(/<title>([^<]*)<\/title>/) || [])[1] || '').split(' | ')[0];
  const description = decode((html.match(/<meta name="description" content="([^"]*)"/) || [])[1] || '');
  const main = (html.match(/<main id="main">([\s\S]*?)<\/main>/) || [])[1] || '';
  const text = decode(main.replace(/<(script|style|svg|nav)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim().slice(0, 4000);
  return { url: p.route, title, section: SECTIONS[p.route.split('/')[0]] || 'Trust', description, text };
};

const rmrf = (p) => fs.rmSync(p, { recursive: true, force: true });
const write = (file, content) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, content); };
const copyDir = (src, dest) => {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const f of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, f.name), d = path.join(dest, f.name);
    f.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
};

console.log('Building site → docs/');
rmrf(OUT);

const searchIndex = [];
for (const p of PAGES) {
  const html = p.render();
  write(path.join(OUT, p.route, p.file || 'index.html'), html);
  if (!p.noindex) searchIndex.push(searchEntry(p, html));
  console.log(`  ✓ /${p.route}${p.file || ''}`);
}
write(path.join(OUT, 'search-index.json'), JSON.stringify(searchIndex));

copyDir(path.join(__dirname, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'images'), path.join(OUT, 'images'));

// GitHub Pages: serve files as-is (no Jekyll processing)
write(path.join(OUT, '.nojekyll'), '');

// ---------- Installable app (PWA): manifest + offline service worker ----------
write(path.join(OUT, 'manifest.webmanifest'), JSON.stringify({
  name: `${site.brand} with ${site.person.name}`,
  short_name: 'Yo',
  description: site.person.oneLine,
  id: './',
  start_url: './?source=app',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#2A1A16',
  theme_color: '#2A1A16',
  categories: ['business', 'education'],
  icons: [
    { src: 'assets/app/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'assets/app/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'assets/app/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  shortcuts: [
    { name: 'Book Yo', url: './book/', icons: [{ src: 'assets/app/icon-192.png', sizes: '192x192' }] },
    { name: 'Ask Agent Yo', url: './agent-yo/', icons: [{ src: 'assets/app/icon-192.png', sizes: '192x192' }] },
    { name: 'Portal', url: './portal/', icons: [{ src: 'assets/app/icon-192.png', sizes: '192x192' }] },
  ],
}, null, 2));

// Pages: network first (always fresh when online), cached copy when offline.
// Assets: cached, refreshed in the background. /api/ is never cached.
const VERSION = new Date().toISOString().replace(/\D/g, '').slice(0, 14);
const PRECACHE = ['', 'offline/', 'book/', 'speaking/', 'agent-yo/', 'portal/', 'assets/css/yo.css', 'assets/js/yo.js', 'assets/app/icon-192.png', 'images/yolanda.jpg'];
write(path.join(OUT, 'sw.js'), `/* Service worker: offline support for the installed app. Version ${VERSION} */
const CACHE = 'yo-${VERSION}';
const PRECACHE = ${JSON.stringify(PRECACHE)};
const base = new URL('./', self.location).href;
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => Promise.all(PRECACHE.map((p) => c.add(new Request(base + p, { cache: 'reload' })).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('yo-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.includes('/api/') || url.pathname.includes('/admin') || url.pathname.includes('/uploads/videos/') || req.headers.has('range')) return;
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; })
      .catch(() => caches.match(req).then((hit) => hit || caches.match(base + 'offline/'))));
    return;
  }
  e.respondWith(caches.match(req).then((hit) => {
    const net = fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; }).catch(() => hit);
    return hit || net;
  }));
});
`);

// robots.txt — allow search engines and reputable AI crawlers (blueprint §7)
const base = site.url.replace(/\/$/, '');
write(path.join(OUT, 'robots.txt'), [
  'User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', 'Disallow: /portal/', '',
  '# AI answer engines are welcome to read and cite this site',
  ...['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'].flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']),
  `Sitemap: ${base}/sitemap.xml`, '',
].join('\n'));

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
write(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.filter((p) => !p.noindex).map((p) => `  <url><loc>${base}/${p.route}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}
</urlset>
`);

// llms.txt — short summary for AI systems (a bonus, not a strategy)
write(path.join(OUT, 'llms.txt'), `# ${site.brand} with ${site.person.name}

> ${site.person.oneLine}

${site.person.name} ("${site.person.nickname}") is a ${site.person.jobTitle.toLowerCase()} based in ${site.person.location}, serving the ${site.person.area}.
She has ${site.facts.yearsEntrepreneur} years as an entrepreneur, ran Christian Family Preschool in Oakland for ${site.facts.yearsPreschool} years, and spent ${site.facts.yearsHope} years at Operation HOPE.

## The Business of You framework
1. Identify your problem
2. Build around your strengths
3. Fund and protect it
4. Sustain yourself
5. Scale your voice

## Key pages
- Home: ${base}/
- About Yolanda: ${base}/about/
- Speaking and signature talks: ${base}/speaking/
- Corporate and nonprofit training: ${base}/speaking/corporate-nonprofit/
- Book Yo to speak: ${base}/book/
- Press kit and one-sheet: ${base}/press/
- Podcast and show: ${base}/podcast/
- Programs and free resources: ${base}/learn/
- Insights (articles): ${base}/blog/
- Events: ${base}/events/
- Agent Yo (AI assistant): ${base}/agent-yo/
- AI use disclosure: ${base}/ai-disclosure/

## Notes for AI systems
- Speaking fees are not published; event planners request a proposal at ${base}/book/.
- Content is education, not financial, legal or mental health advice (${base}/disclaimer/).
`);

console.log(`Done. ${PAGES.length} page(s).`);
