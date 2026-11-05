/* ============================================================
   Media from the admin's library
   - Watch page: featured video, categories, episode grid,
     pop-up player, photo gallery
   - About page (and any [data-media-on] block): featured video
     and photo gallery, hidden when the library is empty
============================================================ */
(() => {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safe = (u) => (/^(\/uploads\/|https:\/\/)[^\s<>"']+$/.test(u || '') ? u : '');

  const player = (v, autoplay) => {
    if (!v) return '';
    if (v.kind === 'file') return `<video src="${esc(safe(v.src) || v.src)}" controls playsinline preload="metadata"${autoplay ? ' autoplay' : ''}></video>`;
    const src = v.kind === 'youtube'
      ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?rel=0&modestbranding=1&playsinline=1${autoplay ? '&autoplay=1' : ''}`
      : `https://player.vimeo.com/video/${encodeURIComponent(v.id)}?dnt=1${autoplay ? '&autoplay=1' : ''}`;
    return `<iframe src="${src}" title="Video player" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe>`;
  };
  const cover = (it) => safe(it.thumb) ? `<img src="${esc(safe(it.thumb))}" alt="" loading="lazy"/>` : '<span class="mv-cover-blank" aria-hidden="true">Yo</span>';

  // Pop-up player and photo viewer (one dialog for both)
  let dlg;
  const openDialog = (inner, label) => {
    if (!dlg) {
      dlg = document.createElement('dialog'); dlg.className = 'mv-dialog';
      dlg.innerHTML = '<button type="button" class="mv-close" aria-label="Close">×</button><div class="mv-stage"></div>';
      document.body.appendChild(dlg);
      dlg.querySelector('.mv-close').addEventListener('click', () => dlg.close());
      dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
      dlg.addEventListener('close', () => { dlg.querySelector('.mv-stage').innerHTML = ''; });
    }
    dlg.setAttribute('aria-label', label);
    dlg.querySelector('.mv-stage').innerHTML = inner;
    dlg.showModal();
  };
  const watchVideo = (it) => openDialog(`<div class="mv-frame">${player(it.video, true)}</div><div class="mv-info"><p class="eyebrow">${esc(it.category || 'The Business of You')}</p><h2>${esc(it.title)}</h2>${it.description ? `<p>${esc(it.description)}</p>` : ''}</div>`, it.title);
  const viewPhotos = (photos, i) => {
    const show = (k) => {
      const p = photos[(k + photos.length) % photos.length]; i = (k + photos.length) % photos.length;
      openDialog(`<figure class="mv-photo"><img src="${esc(safe(p.src))}" alt="${esc(p.title || p.description || 'Photo')}"/>${p.title || p.description ? `<figcaption><b>${esc(p.title)}</b> ${esc(p.description)}</figcaption>` : ''}</figure>${photos.length > 1 ? '<button type="button" class="mv-prev" aria-label="Previous photo">‹</button><button type="button" class="mv-next" aria-label="Next photo">›</button>' : ''}`, 'Photo');
      const prev = dlg.querySelector('.mv-prev'), next = dlg.querySelector('.mv-next');
      if (prev) { prev.onclick = () => show(i - 1); next.onclick = () => show(i + 1); }
    };
    show(i);
  };
  const gallery = (photos) => `<div class="mv-gallery">${photos.map((p, i) => `<button type="button" class="mv-ph" data-ph="${i}"><img src="${esc(safe(p.src))}" alt="${esc(p.title || p.description || 'Photo')}" loading="lazy"/>${p.title ? `<span>${esc(p.title)}</span>` : ''}</button>`).join('')}</div>`;
  const wireGallery = (root, photos) => root.querySelectorAll('[data-ph]').forEach((b) => b.addEventListener('click', () => viewPhotos(photos, Number(b.dataset.ph))));
  const load = (on) => fetch(`/api/media?on=${on}`, { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())).then((o) => o.data);

  // ---------- Watch page ----------
  const watch = $('#watchApp');
  if (watch) {
    load('watch').then((items) => {
      const videos = items.filter((x) => x.kind === 'video'), photos = items.filter((x) => x.kind === 'photo');
      if (!videos.length && !photos.length) { $('#watchEmpty').hidden = false; return; }
      const feat = videos.find((v) => v.featured) || videos[0];
      if (feat) {
        const f = $('#watchFeatured');
        f.hidden = false;
        f.innerHTML = `<div class="mv-feat-player">${player(feat.video, false)}</div><div class="mv-feat-copy"><p class="eyebrow">${feat.featured ? 'Featured episode' : 'Latest episode'}${feat.category ? ' · ' + esc(feat.category) : ''}</p><h2>${esc(feat.title)}</h2>${feat.description ? `<p>${esc(feat.description)}</p>` : ''}</div>`;
      }
      const rest = videos;
      const cats = [...new Set(rest.map((v) => v.category).filter(Boolean))];
      if (rest.length) {
        $('#watchEpisodes').hidden = false;
        $('#watchCats').innerHTML = cats.length > 1 ? ['All', ...cats].map((c, i) => `<button type="button" class="chip${i ? '' : ' on'}" data-cat="${esc(i ? c : '')}" aria-pressed="${!i}">${esc(c)}</button>`).join('') : '';
        const draw = (cat) => {
          $('#watchGrid').innerHTML = rest.filter((v) => !cat || v.category === cat).map((v) => `<button type="button" class="mv-card" data-v="${v.id}"><span class="mv-cover">${cover(v)}<span class="mv-play" aria-hidden="true">▶</span></span><span class="mv-meta">${v.category ? `<small>${esc(v.category)}</small>` : ''}<b>${esc(v.title)}</b>${v.description ? `<span>${esc(v.description.slice(0, 120))}${v.description.length > 120 ? '…' : ''}</span>` : ''}</span></button>`).join('');
          $('#watchGrid').querySelectorAll('[data-v]').forEach((b) => b.addEventListener('click', () => watchVideo(rest.find((v) => String(v.id) === b.dataset.v))));
        };
        $('#watchCats').querySelectorAll('[data-cat]').forEach((b) => b.addEventListener('click', () => {
          $('#watchCats').querySelectorAll('.chip').forEach((c) => { c.classList.toggle('on', c === b); c.setAttribute('aria-pressed', String(c === b)); });
          draw(b.dataset.cat);
        }));
        draw('');
      }
      if (photos.length) { const g = $('#watchPhotos'); g.hidden = false; g.querySelector('.mv-gallery-slot').innerHTML = gallery(photos); wireGallery(g, photos); }
    }).catch(() => { $('#watchEmpty').hidden = false; });
  }

  // ---------- Books page ----------
  const shelf = $('#booksApp');
  if (shelf) {
    fetch('/api/media?kind=book&on=books', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : Promise.reject())).then(({ data }) => {
      if (!data.length) { $('#booksEmpty').hidden = false; return; }
      const coverOf = (b) => (safe(b.thumb) ? `<img src="${esc(safe(b.thumb))}" alt="Cover of ${esc(b.title)}" loading="lazy"/>` : `<span class="bk-blank"><b>${esc(b.title)}</b><small>${esc(b.category)}</small></span>`);
      const getIt = (b) => (safe(b.link) || /^\//.test(b.link || '') ? `<a class="btn btn-gold btn-sm" href="${esc(b.link)}" target="_blank" rel="noopener">Get the book</a>` : '');
      const own = data.filter((b) => b.featured), rest = data.filter((b) => !b.featured);
      if (own.length) {
        const o = $('#booksOwn'); o.hidden = false;
        o.innerHTML = own.map((b) => `<article class="bk-feature"><div class="bk-cover">${coverOf(b)}</div><div><p class="eyebrow">By Yolanda Butler</p><h2 class="h2">${esc(b.title)}</h2>${b.description ? `<p>${esc(b.description)}</p>` : ''}${getIt(b)}</div></article>`).join('');
      }
      $('#booksGrid').innerHTML = rest.map((b, i) => `<button type="button" class="bk-card" data-b="${i}"><span class="bk-cover">${coverOf(b)}</span><b>${esc(b.title)}</b><small>${esc(b.category)}</small></button>`).join('');
      $('#booksGrid').querySelectorAll('[data-b]').forEach((btn) => btn.addEventListener('click', () => {
        const b = rest[Number(btn.dataset.b)];
        openDialog(`<div class="bk-detail"><div class="bk-cover">${coverOf(b)}</div><div><p class="eyebrow">${esc(b.category)}</p><h2>${esc(b.title)}</h2>${b.description ? `<p>${esc(b.description)}</p>` : ''}${getIt(b)}</div></div>`, b.title);
      }));
    }).catch(() => { $('#booksEmpty').hidden = false; });
  }

  // ---------- Media blocks on other pages (About) ----------
  document.querySelectorAll('[data-media-on]').forEach((block) => {
    load(block.dataset.mediaOn).then((items) => {
      const videos = items.filter((x) => x.kind === 'video'), photos = items.filter((x) => x.kind === 'photo');
      if (!videos.length && !photos.length) return;
      const v = videos.find((x) => x.featured) || videos[0];
      block.querySelector('.media-slot').innerHTML = `${v ? `<div class="mv-feat"><div class="mv-feat-player">${player(v.video, false)}</div><div class="mv-feat-copy"><p class="eyebrow">Watch</p><h3>${esc(v.title)}</h3>${v.description ? `<p>${esc(v.description)}</p>` : ''}${videos.length > 1 ? '<a class="link-arrow" href="../watch/">More videos</a>' : ''}</div></div>` : ''}${photos.length ? gallery(photos) : ''}`;
      wireGallery(block, photos);
      block.hidden = false;
    }).catch(() => {});
  });
})();
