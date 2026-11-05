/* ============================================================
   App shell: offline support (service worker), "Install the app"
   prompts, and installed-app mode.
============================================================ */
(() => {
  'use strict';
  const ROOT = new URL(document.body.dataset.root || './', location.href).href;
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage unavailable */ } },
  };
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add('standalone');

  // Offline support (needs https or localhost)
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    // When a new version of the site is published, the new worker takes over and the page reloads once
    const hadController = !!navigator.serviceWorker.controller;
    let reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
    addEventListener('load', () => navigator.serviceWorker.register(ROOT + 'sw.js', { scope: ROOT, updateViaCache: 'none' }).then((reg) => reg.update()).catch(() => {}));
  }

  // Install prompts
  const buttons = [...document.querySelectorAll('.js-install')];
  const DISMISSED = 'yoInstallDismissed';
  let deferred = null;

  const banner = (html, onInstall) => {
    if (standalone || store.get(DISMISSED) || document.querySelector('.install-bar')) return;
    const bar = document.createElement('div');
    bar.className = 'install-bar';
    bar.setAttribute('role', 'dialog'); bar.setAttribute('aria-label', 'Install the app');
    bar.innerHTML = `<img src="${ROOT}assets/app/icon-192.png" alt="" width="44" height="44"/><p>${html}</p>${onInstall ? '<button type="button" class="btn btn-gold btn-sm" data-go>Install</button>' : ''}<button type="button" class="install-x" aria-label="Not now">×</button>`;
    document.body.appendChild(bar);
    requestAnimationFrame(() => bar.classList.add('on'));
    const close = () => { store.set(DISMISSED, '1'); bar.classList.remove('on'); setTimeout(() => bar.remove(), 400); };
    bar.querySelector('.install-x').addEventListener('click', close);
    if (onInstall) bar.querySelector('[data-go]').addEventListener('click', async () => { await onInstall(); close(); });
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
    deferred = null;
    buttons.forEach((b) => { b.hidden = true; });
  };

  addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferred = e;
    buttons.forEach((b) => { b.hidden = false; b.onclick = install; });
    // Offer the app after the visitor has looked around a little
    const views = Number(store.get('yoViews') || 0);
    if (views >= 1 && matchMedia('(max-width: 960px)').matches) setTimeout(() => banner('<b>Get the Yo app</b>Full screen, faster, works offline.', install), 2500);
  });
  addEventListener('appinstalled', () => { buttons.forEach((b) => { b.hidden = true; }); store.set(DISMISSED, '1'); });

  // iPhone Safari has no install prompt: show how to add it once
  const iOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  if (iOS && !standalone && Number(store.get('yoViews') || 0) >= 1) setTimeout(() => banner('<b>Get the Yo app</b>Tap <span aria-label="Share">Share</span> then “Add to Home Screen”.'), 2500);

  store.set('yoViews', String(Number(store.get('yoViews') || 0) + 1));
})();

/* Header "Portal" button: shows your picture and name once you're signed in */
(() => {
  const links = [...document.querySelectorAll('.js-portal-link')];
  let token = null; try { token = localStorage.getItem('yoPortalToken'); } catch { /* storage blocked */ }
  if (!links.length || !token) return;
  fetch('/api/portal/me', { headers: { Authorization: 'Bearer ' + token } }).then((r) => (r.ok ? r.json() : Promise.reject())).then(({ member }) => {
    if (!member) return;
    const firstName = String(member.name || '').split(' ')[0];
    const safe = /^\/uploads\/avatars\/[a-f0-9]{24}\.(jpg|png|webp)$/.test(member.avatar || '') ? member.avatar : '';
    links.forEach((a) => {
      a.classList.add('signed-in');
      a.setAttribute('aria-label', `Portal: signed in as ${member.name}`);
      const txt = a.querySelector('.hdr-portal-txt'); if (txt) txt.textContent = firstName || 'Portal';
      if (safe) { const ic = a.querySelector('.hdr-portal-ic'); if (ic) ic.innerHTML = `<img src="${safe}" alt="" width="28" height="28"/>`; }
    });
  }).catch(() => {});
})();
