/* ============================================================
   Live page editing
   - Everyone: applies the admin's saved edits (text and photos)
   - Admin (signed in to the portal): "Edit this page" button;
     click any text to change it, click a photo to replace it.
   Each element is identified by its original wording (or photo
   address), so edits stay attached when the site is rebuilt.
============================================================ */
(() => {
  'use strict';
  if (document.body.classList.contains('page-portal')) return;
  const main = document.getElementById('main');
  if (!main) return;
  const PATH = location.pathname.replace(/index\.html$/, '');
  const TOKEN = (() => { try { return localStorage.getItem('yoPortalToken'); } catch { return null; } })();
  const TEXT = 'h1, h2, h3, h4, p, li, blockquote, figcaption, dt, dd, .btn, summary';
  const SKIP = 'form, .agent, .cookie, .crumbs, .tabbar, .p-view, [data-no-edit], script, noscript, .media-block';

  // Small stable hash of a string
  const hash = (s) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0; return h.toString(36); };

  // Elements that can be edited, keyed by original content (computed before any edit is applied)
  const targets = new Map();
  const collect = () => {
    const seen = {};
    const add = (key, el, kind) => { seen[key] = (seen[key] || 0) + 1; const k = `${key}~${seen[key]}`; targets.set(k, { el, kind, original: kind === 'image' ? el.getAttribute('src') : el.innerHTML }); el.dataset.editKey = k; };
    main.querySelectorAll(TEXT).forEach((el) => {
      if (el.closest(SKIP)) return;
      if (el.querySelector(TEXT)) return; // edit the innermost block only
      const text = el.textContent.replace(/\s+/g, ' ').trim();
      if (!text || text.length > 3000) return;
      add(`t:${el.tagName.toLowerCase()}:${hash(text)}`, el, 'text');
    });
    main.querySelectorAll('img').forEach((img) => {
      if (img.closest(SKIP)) return;
      add(`i:${hash(img.getAttribute('src') || '')}`, img, 'image');
    });
  };
  collect();

  const apply = (data) => {
    Object.entries(data).forEach(([k, v]) => {
      const t = targets.get(k);
      if (!t) return;
      if (v.kind === 'image' && t.kind === 'image') { t.el.src = v.value; t.el.removeAttribute('srcset'); }
      else if (v.kind === 'text' && t.kind === 'text') t.el.innerHTML = v.value;
    });
  };
  let saved = {};
  fetch('/api/content?path=' + encodeURIComponent(PATH), { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : Promise.reject())).then((out) => { saved = out.data || {}; apply(saved); }).catch(() => {});

  // ---------- Admin editing ----------
  if (!TOKEN) return;
  fetch('/api/portal/me', { headers: { Authorization: 'Bearer ' + TOKEN } }).then((r) => (r.ok ? r.json() : Promise.reject())).then((out) => {
    if (out.member && out.member.role === 'admin') setupEditor();
  }).catch(() => {});

  function setupEditor() {
    const launch = document.createElement('button');
    launch.type = 'button'; launch.className = 'ed-launch';
    launch.innerHTML = '<span aria-hidden="true">✎</span> Edit this page';
    document.body.appendChild(launch);

    const bar = document.createElement('div');
    bar.className = 'ed-bar'; bar.hidden = true; bar.setAttribute('role', 'toolbar'); bar.setAttribute('aria-label', 'Page editor');
    bar.innerHTML = `<p><b>Editing this page.</b> Click any words to change them. Click a photo to replace it.</p>
      <div><button type="button" class="btn btn-sm ed-reset">Reset page</button><button type="button" class="btn btn-sm ed-cancel">Cancel</button><button type="button" class="btn btn-gold btn-sm ed-save">Save changes</button></div>
      <span class="ed-msg" aria-live="polite"></span>`;
    document.body.appendChild(bar);
    const msg = bar.querySelector('.ed-msg');
    const picker = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/jpeg,image/png,image/webp', hidden: true });
    document.body.appendChild(picker);
    let editing = false, pickingFor = null;
    const changedImages = new Map();
    const before = new Map();

    const blockLinks = (e) => { if (editing && e.target.closest('#main a, #main button') && !e.target.closest('.ed-bar')) { if (!e.target.closest('[contenteditable]') || e.target.closest('a')) e.preventDefault(); } };
    document.addEventListener('click', blockLinks, true);

    const start = () => {
      editing = true; document.body.classList.add('ed-on'); bar.hidden = false; launch.hidden = true; msg.textContent = '';
      targets.forEach((t, k) => {
        before.set(k, t.kind === 'image' ? t.el.getAttribute('src') : t.el.innerHTML);
        if (t.kind === 'text') { t.el.contentEditable = 'true'; t.el.spellcheck = true; }
        else t.el.classList.add('ed-img');
      });
    };
    const stop = () => {
      editing = false; document.body.classList.remove('ed-on'); bar.hidden = true; launch.hidden = false;
      targets.forEach((t) => { if (t.kind === 'text') t.el.removeAttribute('contenteditable'); else t.el.classList.remove('ed-img'); });
    };
    launch.addEventListener('click', start);
    bar.querySelector('.ed-cancel').addEventListener('click', () => {
      targets.forEach((t, k) => { const b = before.get(k); if (b === undefined) return; if (t.kind === 'image') t.el.setAttribute('src', b); else t.el.innerHTML = b; });
      changedImages.clear(); stop();
    });

    // Replace a photo
    main.addEventListener('click', (e) => {
      if (!editing) return;
      const img = e.target.closest('img.ed-img');
      if (!img) return;
      e.preventDefault(); pickingFor = img; picker.value = ''; picker.click();
    });
    picker.addEventListener('change', async () => {
      const file = picker.files[0]; if (!file || !pickingFor) return;
      msg.textContent = 'Uploading photo…';
      try {
        const res = await fetch('/api/portal/uploads?kind=photos', { method: 'POST', headers: { Authorization: 'Bearer ' + TOKEN, 'Content-Type': file.type || 'image/jpeg' }, body: file });
        const out = await res.json();
        if (!out.ok) { msg.textContent = out.message; return; }
        pickingFor.src = out.url; pickingFor.removeAttribute('srcset');
        changedImages.set(pickingFor.dataset.editKey, out.url);
        msg.textContent = 'Photo ready. Press Save changes to publish it.';
      } catch { msg.textContent = 'The upload failed. Please try again.'; }
    });

    // Paste as plain text so formatting from other apps doesn't come along
    main.addEventListener('paste', (e) => {
      if (!editing || !e.target.closest('[contenteditable="true"]')) return;
      e.preventDefault();
      document.execCommand('insertText', false, (e.clipboardData || window.clipboardData).getData('text/plain'));
    });

    bar.querySelector('.ed-save').addEventListener('click', async () => {
      const items = [];
      targets.forEach((t, k) => {
        if (t.kind === 'image') { if (changedImages.has(k)) items.push({ key: k, kind: 'image', value: changedImages.get(k) }); return; }
        const now = t.el.innerHTML;
        if (now === before.get(k)) return;
        if (now.trim() === t.original.trim() || !t.el.textContent.trim()) items.push({ key: k, revert: true });
        else items.push({ key: k, kind: 'text', value: now });
      });
      if (!items.length) { msg.textContent = 'Nothing changed yet.'; return; }
      msg.textContent = 'Saving…';
      const res = await fetch('/api/portal/content', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ path: PATH, items }) });
      const out = await res.json().catch(() => ({ ok: false, message: 'Could not save.' }));
      msg.textContent = out.message;
      if (out.ok) { changedImages.clear(); setTimeout(stop, 900); }
    });

    bar.querySelector('.ed-reset').addEventListener('click', async () => {
      if (!confirm('Put this whole page back to its original words and photos?')) return;
      const res = await fetch('/api/portal/content', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + TOKEN }, body: JSON.stringify({ path: PATH, reset: true }) });
      const out = await res.json().catch(() => ({ ok: false }));
      if (out.ok) { targets.forEach((t) => { if (t.kind === 'image') t.el.setAttribute('src', t.original); else t.el.innerHTML = t.original; }); msg.textContent = out.message; setTimeout(stop, 1200); }
    });
  }

})();
