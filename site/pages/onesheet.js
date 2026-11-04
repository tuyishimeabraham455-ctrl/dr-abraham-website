// ============================================================
//  PRINTABLE ONE-SHEET (press/one-sheet/) — prints on one page,
//  "Save as PDF" from the browser print dialog.
// ============================================================
const site = require('../content/site');
const { talks, workshops, eventTypes } = require('../content/talks');
const { page, esc, icon, abs, ids, rel } = require('../lib/layout');

module.exports = () => {
  const depth = 2, r = rel(depth), path = 'press/one-sheet/';
  const f = site.facts;

  const body = `
<div class="sheet-tools wrap"><a class="link-arrow" href="${r}press/">← Back to the press kit</a><button type="button" class="btn btn-dark btn-sm js-print">Print or save as PDF</button></div>
<article class="sheet" aria-label="Speaker one-sheet">
  <header class="sheet-head">
    <div class="sheet-photo"><img src="${r}images/yolanda.jpg" alt="Yolanda Butler" width="720" height="720"/></div>
    <div>
      <p class="sheet-k">Keynote speaker · Podcaster · Business strategist</p>
      <h1>Yolanda <em>"Yo"</em> Butler</h1>
      <p class="sheet-tag">Build a business around <em>you.</em></p>
    </div>
  </header>
  <div class="sheet-grid">
    <section>
      <h2>About</h2>
      <p>${esc(site.person.oneLine)} An entrepreneur for ${f.yearsEntrepreneur} years, Yo ran Christian Family Preschool in Oakland for ${f.yearsPreschool} years, trained women entrepreneurs, advised owners at the Contra Costa SBDC, and spent ${f.yearsHope} years at Operation HOPE, rising to Financial Well-Being Coach.</p>
      <h2>Signature keynotes</h2>
      <ul class="sheet-talks">${talks.map((t) => `<li><b>${esc(t.title)}</b><span>${esc(t.subtitle)}</span></li>`).join('')}</ul>
      <h2>Workshops</h2>
      <ul class="sheet-list">${workshops.map((w) => `<li>${esc(w.title)} <span>· ${esc(w.format.replace('Workshop · ', ''))}</span></li>`).join('')}</ul>
    </section>
    <aside>
      <div class="sheet-stats"><div><b>${f.yearsEntrepreneur}</b><span>years as an entrepreneur</span></div><div><b>${f.yearsHope}</b><span>years at Operation HOPE</span></div><div><b>${f.recommendations}</b><span>recommendations</span></div></div>
      <h2>Formats</h2><p>Keynote · Workshop · Panel · Fireside chat · Virtual</p>
      <h2>Audiences</h2><p>${eventTypes.map(esc).join(' · ')}</p>
      <h2>Education</h2><p>Business Administration, Cal State East Bay. Former president, Black Business Association.</p>
      <h2>Book Yo</h2><p>${esc(site.email.booking)}<br/>${esc(abs('book/'))}</p>
    </aside>
  </div>
  <footer class="sheet-foot"><span>The Business <em>of</em> You</span><span>${esc(site.person.location)} · Bay Area &amp; virtual</span></footer>
</article>
`;

  return page({
    path, depth, active: 'press/',
    title: 'Speaker One-Sheet | Yolanda "Yo" Butler',
    description: 'One-page speaker sheet for Yolanda "Yo" Butler: bio, signature keynotes, workshops, formats, audiences and booking contact.',
    body, bodyClass: 'page-sheet',
    schema: [{ '@type': 'WebPage', url: abs(path), name: 'Speaker one-sheet', about: { '@id': ids.person } }],
  });
};
