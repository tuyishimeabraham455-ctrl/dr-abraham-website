/* ============================================================
   DR. ABRAHAM — Theme interactions (mf-* components)
   Works alongside main.js, which handles page tracking and
   posting .email-form submissions to /api/subscribers.
   ============================================================ */

(function () {
  'use strict';

  /* ── Sticky nav shadow ── */
  const nav = document.querySelector('.mf-nav');
  if (nav) {
    const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile drawer ── */
  const burger = document.querySelector('.mf-burger');
  const drawer = document.querySelector('.mf-drawer');
  if (burger && drawer) {
    const setOpen = (open) => {
      burger.classList.toggle('is-open', open);
      drawer.classList.toggle('is-open', open);
      document.body.classList.toggle('mf-locked', open);
      burger.setAttribute('aria-expanded', String(open));
    };
    burger.addEventListener('click', () => setOpen(!drawer.classList.contains('is-open')));
    drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') setOpen(false); });
  }

  /* ── Active menu link ── */
  const page = (window.location.pathname.split('/').pop() || 'index.html').replace(/\.html$/, '') || 'index';
  document.querySelectorAll('.mf-menu a, .mf-drawer a').forEach(a => {
    const href = (a.getAttribute('href') || '').replace(/\.html$/, '');
    if (href === page || (page === 'index' && href === 'index')) a.classList.add('is-active');
  });

  /* ── Reveal on scroll ── */
  // .mf-reveal gets .is-in; the older styles.css classes (.anim-up etc.) get .in
  const reveals = document.querySelectorAll('.mf-reveal, .anim-up, .anim-left, .anim-right, .anim-scale, .anim-fade');
  const show = el => el.classList.add(el.classList.contains('mf-reveal') ? 'is-in' : 'in');
  if ('IntersectionObserver' in window && reveals.length) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { show(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach(el => io.observe(el));
  } else {
    reveals.forEach(show);
  }

  /* ── Count-up numbers: <b data-count="50000" data-suffix="+"> ── */
  const counters = document.querySelectorAll('[data-count]');
  if ('IntersectionObserver' in window && counters.length) {
    const fmt = n => n >= 1000 ? n.toLocaleString('en-US') : String(n);
    const run = el => {
      const target = parseFloat(el.dataset.count);
      const prefix = el.dataset.prefix || '';
      const suffix = el.dataset.suffix || '';
      const start = performance.now();
      const step = now => {
        const p = Math.min((now - start) / 1600, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = prefix + fmt(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const co = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { run(entry.target); co.unobserve(entry.target); }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => co.observe(el));
  }

  /* ── Video modal ──
     [data-video]                 → plays the animated story reel
     [data-video="<YouTube url>"] → plays that YouTube video
     [data-video="videos/x.mp4"]  → plays that video file */
  const modal = document.querySelector('.mf-modal');
  if (modal) {
    const box = modal.querySelector('.mf-modal-box');
    const reel = modal.querySelector('.mf-reel');
    const slides = reel ? Array.from(reel.querySelectorAll('.mf-reel-slide')) : [];
    const SLIDE_MS = 5000;
    let current = 0, timer = null, frame = null;

    // Build one progress bar per slide
    let bars = [];
    if (reel && slides.length) {
      const wrap = document.createElement('div');
      wrap.className = 'mf-reel-bars';
      slides.forEach(() => { const b = document.createElement('span'); b.className = 'mf-reel-bar'; b.innerHTML = '<i></i>'; wrap.appendChild(b); });
      reel.appendChild(wrap);
      bars = Array.from(wrap.children);
    }

    const show = (i) => {
      clearTimeout(timer);
      current = Math.max(0, Math.min(i, slides.length - 1));
      slides.forEach((s, n) => s.classList.toggle('is-active', n === current));
      bars.forEach((b, n) => {
        b.classList.remove('is-active');
        b.classList.toggle('is-done', n < current);
      });
      void bars[current].offsetWidth; // restart the bar animation
      bars[current].classList.add('is-active');
      if (current < slides.length - 1) timer = setTimeout(() => show(current + 1), SLIDE_MS);
    };

    const youtubeId = (url) => {
      const m = url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
      return m ? m[1] : null;
    };

    const open = (src) => {
      modal.classList.add('is-open');
      document.body.classList.add('mf-locked');
      if (src) {
        if (reel) reel.hidden = true;
        frame = document.createElement('div');
        frame.className = 'mf-modal-frame';
        const id = youtubeId(src);
        frame.innerHTML = id
          ? '<iframe src="https://www.youtube-nocookie.com/embed/' + id + '?autoplay=1&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen title="Video"></iframe>'
          : '<video src="' + src.replace(/"/g, '') + '" controls autoplay playsinline></video>';
        box.appendChild(frame);
      } else if (slides.length) {
        reel.hidden = false;
        show(0);
      }
    };

    const close = () => {
      modal.classList.remove('is-open');
      document.body.classList.remove('mf-locked');
      clearTimeout(timer);
      if (frame) { frame.remove(); frame = null; }
    };

    document.querySelectorAll('[data-video]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.preventDefault();
        open((btn.getAttribute('data-video') || '').trim());
      });
    });

    // Tap the left third to go back, anywhere else to go forward
    if (reel) {
      reel.addEventListener('click', e => {
        if (e.target.closest('a')) return;
        const r = reel.getBoundingClientRect();
        const back = (e.clientX - r.left) < r.width / 3;
        if (back) show(current - 1);
        else if (current < slides.length - 1) show(current + 1);
      });
    }

    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.mf-modal-close')) close(); });
    document.addEventListener('keydown', e => {
      if (!modal.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (reel && !reel.hidden && e.key === 'ArrowRight') show(current + 1);
      if (reel && !reel.hidden && e.key === 'ArrowLeft') show(current - 1);
    });
  }

  /* ── Silent thumbnail previews: load and play only while on screen ── */
  const thumbs = document.querySelectorAll('.mf-thumb-video[data-src]');
  if (thumbs.length && 'IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const vo = new IntersectionObserver(entries => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          if (!v.src) {
            v.src = v.dataset.src;
            v.addEventListener('playing', () => v.classList.add('is-ready'), { once: true });
          }
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      });
    }, { threshold: 0.25 });
    thumbs.forEach(v => vo.observe(v));
  }

  /* ── Hero background video: plays only if the file exists (data-hero-video="videos/hero.mp4") ── */
  document.querySelectorAll('[data-hero-video]').forEach(holder => {
    const src = holder.getAttribute('data-hero-video');
    if (!src || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    fetch(src, { method: 'HEAD' }).then(res => {
      if (!res.ok || !(res.headers.get('content-type') || '').startsWith('video')) return;
      const v = document.createElement('video');
      v.className = 'mf-hero-video';
      v.src = src; v.muted = true; v.loop = true; v.autoplay = true; v.playsInline = true;
      v.setAttribute('aria-hidden', 'true');
      v.addEventListener('canplay', () => v.classList.add('is-ready'), { once: true });
      holder.appendChild(v);
      v.play().catch(() => {});
    }).catch(() => {});
  });

  /* ── Story table of contents highlight (about page) ── */
  const tocLinks = document.querySelectorAll('.mf-story-toc a');
  if ('IntersectionObserver' in window && tocLinks.length) {
    const map = new Map();
    tocLinks.forEach(a => { const t = document.querySelector(a.getAttribute('href')); if (t) map.set(t, a); });
    const to = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          tocLinks.forEach(a => a.classList.remove('is-active'));
          map.get(entry.target).classList.add('is-active');
        }
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    map.forEach((_, section) => to.observe(section));
  }
})();
