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

// Every page: route (folder path), module that returns HTML, sitemap priority
const PAGES = [
  { route: '', module: './pages/home', priority: '1.0' },
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
  delete require.cache[require.resolve(p.module)];
  const html = require(p.module)();
  write(path.join(OUT, p.route, 'index.html'), html);
  console.log(`  ✓ /${p.route}`);
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
