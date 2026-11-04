/* Site search: loads search-index.json once, ranks by title > section > text matches */
(() => {
  const form = document.getElementById('srchForm');
  if (!form) return;
  const ROOT = document.body.dataset.root || './';
  const q = document.getElementById('srchQ'), list = document.getElementById('srchList');
  const count = document.getElementById('srchCount'), empty = document.getElementById('srchEmpty');
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  let index = null;

  const load = async () => {
    if (index) return index;
    const res = await fetch(ROOT + 'search-index.json');
    index = (await res.json()).map((p) => ({ ...p, _t: norm(p.title), _s: norm(p.section), _x: norm(p.description + ' ' + p.text) }));
    return index;
  };

  // A short excerpt around the first match, with the matched words highlighted
  const snippet = (p, words) => {
    const src = p.description + ' ' + p.text, low = norm(src);
    const at = Math.max(0, words.reduce((m, w) => { const i = low.indexOf(w); return i >= 0 && (m < 0 || i < m) ? i : m; }, -1));
    let out = esc((at > 60 ? '…' : '') + src.slice(Math.max(0, at - 60), at + 160).trim() + '…');
    words.forEach((w) => { out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi'), '<mark>$1</mark>'); });
    return out;
  };

  const run = async () => {
    const term = q.value.trim();
    history.replaceState(null, '', term ? '?q=' + encodeURIComponent(term) : location.pathname);
    if (!term) { list.innerHTML = ''; count.textContent = ''; empty.hidden = true; return; }
    const words = norm(term).split(/\s+/).filter((w) => w.length > 1);
    if (!words.length) return;
    const idx = await load();
    const hits = idx.map((p) => {
      let score = 0;
      for (const w of words) {
        const s = (p._t.includes(w) ? 10 : 0) + (p._s.includes(w) ? 4 : 0) + (p._x.includes(w) ? 1 + Math.min(p._x.split(w).length - 2, 5) : 0);
        if (!s) return null; // every word must match somewhere
        score += s;
      }
      return { p, score };
    }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 30);
    count.textContent = `${hits.length} result${hits.length === 1 ? '' : 's'} for “${term}”`;
    empty.hidden = hits.length > 0;
    list.innerHTML = hits.map(({ p }) => `<li><a class="srch-hit" href="${ROOT}${esc(p.url)}"><span class="srch-sec">${esc(p.section)}</span><b>${esc(p.title)}</b><p>${snippet(p, words)}</p></a></li>`).join('');
  };

  let t;
  q.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 160); });
  form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  const initial = new URLSearchParams(location.search).get('q');
  if (initial) { q.value = initial; run(); }
  q.focus();
})();
