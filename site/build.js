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
];

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

for (const p of PAGES) {
  write(path.join(OUT, p.route, p.file || 'index.html'), p.render());
  console.log(`  ✓ /${p.route}${p.file || ''}`);
}

copyDir(path.join(__dirname, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(ROOT, 'images'), path.join(OUT, 'images'));

// GitHub Pages: serve files as-is (no Jekyll processing)
write(path.join(OUT, '.nojekyll'), '');

// robots.txt — allow search engines and reputable AI crawlers (blueprint §7)
const base = site.url.replace(/\/$/, '');
write(path.join(OUT, 'robots.txt'), [
  'User-agent: *', 'Allow: /', 'Disallow: /admin', 'Disallow: /api/', '',
  '# AI answer engines are welcome to read and cite this site',
  ...['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'Claude-SearchBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'].flatMap((b) => [`User-agent: ${b}`, 'Allow: /', '']),
  `Sitemap: ${base}/sitemap.xml`, '',
].join('\n'));

// sitemap.xml
const today = new Date().toISOString().slice(0, 10);
write(path.join(OUT, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${PAGES.map((p) => `  <url><loc>${base}/${p.route}</loc><lastmod>${today}</lastmod><priority>${p.priority}</priority></url>`).join('\n')}
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
- Book Yo: ${base}/book/
- Speaking: ${base}/speaking/
`);

console.log(`Done. ${PAGES.length} page(s).`);
