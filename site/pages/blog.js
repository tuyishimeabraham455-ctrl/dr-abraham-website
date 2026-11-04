// ============================================================
//  BLOG / INSIGHTS — index with categories, article pages
// ============================================================
const site = require('../content/site');
const { posts, categories } = require('../content/posts');
const { talks } = require('../content/talks');
const { page, esc, icon, abs, ids, rel, crumbs, pageHero } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

const fmtDate = (d) => new Date(d + 'T12:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const card = (p, r, i = 0) => `<a class="post-card reveal" style="--d:${i * 80}ms" href="${r}blog/${p.slug}/" data-cat="${esc(p.category)}">
  <span class="post-cat">${esc(p.category)}</span><b>${esc(p.title)}</b><small>${esc(p.excerpt)}</small>
  <span class="post-meta">${fmtDate(p.date)} · ${p.minutes} min read</span></a>`;

exports.index = () => {
  const depth = 1, r = rel(depth), path = 'blog/';
  const bc = crumbs([['Insights', path]], depth);
  const body = `
${pageHero({ mark: 'Ink', eyebrow: 'Insights', title: 'Ideas for building <em>the business of you.</em>', lead: 'Practical writing on business, financial wellness, mental wellness and speaking, from Yolanda "Yo" Butler.', crumbsHtml: bc.html })}
<section class="sec" aria-label="Articles">
  <div class="wrap">
    <div class="filter-bar reveal" id="postFilters"><div class="filter-group" role="group" aria-label="Filter by category"><span>Category</span><button type="button" class="chip on" data-cat="">All</button>${categories.map((c) => `<button type="button" class="chip" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div></div>
    <div class="post-grid" id="postGrid">${posts.map((p, i) => card(p, r, i)).join('')}</div>
    <p class="filter-empty" id="postEmpty" hidden>New articles in this category are on the way. <a href="#news">Get them by email</a>.</p>
  </div>
</section>
<section class="sec blush" id="news" aria-labelledby="newsTitle">
  <div class="wrap magnet-in" style="grid-template-columns:1fr 1fr">
    <div><p class="eyebrow reveal">The Sunday Letter</p><h2 class="h2 reveal" id="newsTitle">One idea, <em>every Sunday.</em></h2><p class="reveal">For your business and your wellbeing. Short, practical, free.</p></div>
    <div><form class="inline-form big reveal js-sub" data-source="blog"><label class="sr" for="blogEmail">Email address</label><input id="blogEmail" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-dark magnetic">Subscribe</button></form><p class="form-msg" aria-live="polite"></p></div>
  </div>
</section>`;
  return page({ path, depth, active: '', title: 'Insights on Business & Financial Wellness | Yo', description: 'Articles from Yolanda "Yo" Butler on testing business ideas, business credit, financial and mental wellness, social capital and speaking.', body, scripts: ['assets/js/podcast.js'], schema: [{ '@type': 'Blog', '@id': abs('blog/#blog'), url: abs(path), name: 'Insights', author: { '@id': ids.person } }, bc.schema] });
};

exports.post = (slug) => {
  const p = posts.find((x) => x.slug === slug);
  const depth = 2, r = rel(depth), path = `blog/${p.slug}/`;
  const bc = crumbs([['Insights', 'blog/'], [p.title, path]], depth);
  const talk = talks.find((t) => t.slug === p.talk);
  const related = posts.filter((x) => x.slug !== slug).slice(0, 2);
  const block = ([type, v]) => type === 'h2' ? `<h2 class="h3">${esc(v)}</h2>`
    : type === 'ul' ? `<ul class="ticks">${v.map((i) => `<li>${icon('check')}${esc(i)}</li>`).join('')}</ul>`
      : type === 'quote' ? `<blockquote class="pull">"${esc(v)}"</blockquote>` : `<p>${esc(v)}</p>`;
  const [first, ...rest] = p.body;
  const body = `
${pageHero({ mark: '¶', eyebrow: `${esc(p.category)} · ${p.minutes} min read`, title: esc(p.title), lead: '', crumbsHtml: bc.html, extra: `<p class="byline reveal">By <a href="${r}about/">Yolanda "Yo" Butler</a> · <time datetime="${p.date}">${fmtDate(p.date)}</time></p>` })}
<article class="sec" aria-labelledby="postTitle">
  <div class="wrap article-in">
    <div class="prose article">
      <p class="answer-first dropcap">${esc(first[1])}</p>
      ${rest.map(block).join('\n      ')}
      <div class="author-box">
        <img src="${r}images/yolanda.jpg" alt="Yolanda Butler" width="72" height="72" loading="lazy"/>
        <div><b>About the author</b><p>${esc(site.person.oneLine)}</p><a class="link-arrow" href="${r}about/">More about Yo ${icon('arrow')}</a></div>
      </div>
    </div>
    <aside class="article-side">
      ${talk ? `<a class="shortcut reveal" href="${r}speaking/${talk.slug}/"><span class="asset-ic">${icon('mic')}</span><b>${esc(talk.title)}</b><small>The keynote on this topic</small><span class="sc-go">${icon('arrow')}</span></a>` : ''}
      <a class="shortcut reveal" href="${r}learn/${p.resource}/"><span class="asset-ic">${icon('down')}</span><b>Free resource</b><small>Put this article into practice</small><span class="sc-go">${icon('arrow')}</span></a>
      <form class="side-news reveal js-sub" data-source="blog-post"><b>The Sunday Letter</b><small>One idea every Sunday.</small><label class="sr" for="sideEmail">Email address</label><input id="sideEmail" name="email" type="email" placeholder="Your email" required autocomplete="email"/><button class="btn btn-dark btn-sm btn-block">Subscribe</button><p class="form-msg" aria-live="polite"></p></form>
    </aside>
  </div>
</article>
<section class="sec blush" aria-labelledby="moreTitle">
  <div class="wrap">
    <div class="sec-head"><p class="eyebrow reveal">Keep reading</p><h2 class="h2 reveal" id="moreTitle">Related <em>insights.</em></h2></div>
    <div class="post-grid two">${related.map((x, i) => card(x, r, i)).join('')}</div>
  </div>
</section>
${ctaBand(r)}`;
  return page({
    path, depth, active: '', title: p.title.slice(0, 60), description: p.excerpt.slice(0, 155), body,
    schema: [{ '@type': 'BlogPosting', '@id': abs(path + '#article'), headline: p.title, description: p.excerpt, datePublished: p.date, dateModified: p.updated || p.date, author: { '@id': ids.person }, publisher: { '@id': ids.org }, image: abs(site.person.image), mainEntityOfPage: abs(path), articleSection: p.category, isPartOf: { '@id': abs('blog/#blog') } }, bc.schema],
  });
};
