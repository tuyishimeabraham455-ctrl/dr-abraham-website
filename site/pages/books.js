// ============================================================
//  BOOKS — Yo's bookshelf (books added by the admin under
//  Admin · Media; filled in by assets/js/media.js)
// ============================================================
const { page, icon, rel, crumbs, pageHero, abs } = require('../lib/layout');
const { ctaBand } = require('../lib/partials');

module.exports = () => {
  const depth = 2, r = rel(depth), path = 'learn/books/';
  const bc = crumbs([['Learn', 'learn/'], ['Books', path]], depth);
  const body = `
${pageHero({ mark: 'B', eyebrow: "Yo's bookshelf", title: 'Books that <em>build you.</em>', lead: 'The books Yo returns to on business, money, leadership and keeping yourself well while you build.', crumbsHtml: bc.html })}
<section class="sec" id="booksApp" aria-label="Books">
  <div class="wrap">
    <div id="booksOwn" class="bk-own" hidden></div>
    <div class="bk-grid" id="booksGrid"></div>
    <div class="mv-empty" id="booksEmpty" hidden>
      ${icon('file')}
      <h2 class="h3">The bookshelf is being stocked.</h2>
      <p>Check back soon, or start with the free workbook.</p>
      <a class="btn btn-dark" href="${r}learn/workbook/">Get the free workbook ${icon('arrow')}</a>
    </div>
  </div>
</section>
${ctaBand(r, { title: 'Ready to <em>do the work?</em>', lead: 'Turn reading into results with Yo\'s programs and free resources.', primary: ['Explore programs', 'learn/'], secondary: ['Book Yo', 'book/'] })}`;
  return page({ path, depth, title: "Yo's Bookshelf | The Business of You", description: 'Books Yolanda "Yo" Butler recommends on business, money, leadership and wellbeing for entrepreneurs and speakers.', body, active: 'learn/', scripts: ['assets/js/media.js'], schema: [{ '@type': 'CollectionPage', name: "Yo's bookshelf", url: abs(path) }, bc.schema] });
};
