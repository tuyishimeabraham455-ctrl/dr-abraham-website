/* ============================================================
   DR. ABRAHAM — Main JavaScript
   Smooth interactions, animations, carousel, FAQ, forms
   ============================================================ */

(function () {
  'use strict';

  /* ── Track page view ── */
  fetch('/api/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ page: window.location.pathname || '/' })
  }).catch(() => {});

  /* ── Sticky Navbar ── */
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    const onScroll = () => {
      navbar.classList.toggle('scrolled', window.scrollY > 50);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ── Mobile Menu ── */
  const hamburger = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');
  const mobileClose = document.querySelector('.mobile-menu-close');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });
    if (mobileClose) {
      mobileClose.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    }
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ── Active Nav Link ── */
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.navbar-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ── Scroll Animations (Intersection Observer) ── */
  const animatedEls = document.querySelectorAll(
    '.animate-on-scroll, .animate-left, .animate-right'
  );
  if (animatedEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    animatedEls.forEach(el => observer.observe(el));
  }

  /* ── Stats Counter Animation ── */
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  if (statNumbers.length) {
    const formatNumber = (num, suffix) => {
      if (num >= 1000000) return (num / 1000000).toFixed(0) + 'M' + suffix;
      if (num >= 1000) return (num / 1000).toFixed(0) + 'K' + suffix;
      return num + suffix;
    };
    const animateCounter = (el) => {
      const target = parseInt(el.dataset.target, 10);
      const suffix = el.dataset.suffix || '';
      const prefix = el.dataset.prefix || '';
      const duration = 2000;
      const start = performance.now();
      const step = (timestamp) => {
        const elapsed = timestamp - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = Math.floor(eased * target);
        el.textContent = prefix + formatNumber(current, suffix);
        if (progress < 1) requestAnimationFrame(step);
        else el.textContent = prefix + formatNumber(target, suffix);
      };
      requestAnimationFrame(step);
    };
    const statsObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            statsObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statNumbers.forEach(el => statsObserver.observe(el));
  }

  /* ── Testimonial Carousel ── */
  const carousel = document.querySelector('.testimonial-carousel');
  if (carousel) {
    const track = carousel.querySelector('.testimonial-track');
    const slides = carousel.querySelectorAll('.testimonial-slide');
    const dotsContainer = carousel.querySelector('.carousel-dots');
    const prevBtn = carousel.querySelector('.carousel-btn-prev');
    const nextBtn = carousel.querySelector('.carousel-btn-next');
    let current = 0;
    let autoTimer = null;

    const goTo = (index) => {
      current = (index + slides.length) % slides.length;
      if (track) track.style.transform = `translateX(-${current * 100}%)`;
      if (dotsContainer) {
        dotsContainer.querySelectorAll('.carousel-dot').forEach((dot, i) => {
          dot.classList.toggle('active', i === current);
        });
      }
    };

    // Build dots
    if (dotsContainer && slides.length > 1) {
      slides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', `Slide ${i + 1}`);
        dot.addEventListener('click', () => { clearInterval(autoTimer); goTo(i); startAuto(); });
        dotsContainer.appendChild(dot);
      });
    }

    if (prevBtn) prevBtn.addEventListener('click', () => { clearInterval(autoTimer); goTo(current - 1); startAuto(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { clearInterval(autoTimer); goTo(current + 1); startAuto(); });

    const startAuto = () => {
      autoTimer = setInterval(() => goTo(current + 1), 5000);
    };
    if (slides.length > 1) startAuto();
  }

  /* ── FAQ Accordion ── */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (question && answer) {
      question.addEventListener('click', () => {
        const isOpen = question.classList.contains('open');
        // Close all
        faqItems.forEach(other => {
          other.querySelector('.faq-question').classList.remove('open');
          other.querySelector('.faq-answer').classList.remove('open');
        });
        // Open clicked if it was closed
        if (!isOpen) {
          question.classList.add('open');
          answer.classList.add('open');
        }
      });
    }
  });

  /* ── Blog Category Filter ── */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const blogCards = document.querySelectorAll('.blog-card[data-category]');
  if (filterBtns.length && blogCards.length) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.filter;
        blogCards.forEach(card => {
          const show = cat === 'all' || card.dataset.category === cat;
          card.style.display = show ? '' : 'none';
          if (show) {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            setTimeout(() => {
              card.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
              card.style.opacity = '1';
              card.style.transform = 'translateY(0)';
            }, 10);
          }
        });
      });
    });
  }

  /* ── Blog Search ── */
  const blogSearchInput = document.querySelector('.blog-search input');
  if (blogSearchInput && blogCards.length) {
    blogSearchInput.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      blogCards.forEach(card => {
        const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
        const text = card.querySelector('p')?.textContent.toLowerCase() || '';
        card.style.display = (title.includes(q) || text.includes(q)) ? '' : 'none';
      });
    });
  }

  /* ── Contact Form Validation + API Submit ── */
  const contactForm = document.querySelector('#contact-form');
  if (contactForm) {
    const showError = (input, msg) => {
      input.classList.add('error');
      const errEl = input.parentElement.querySelector('.form-error');
      if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
    };
    const clearError = (input) => {
      input.classList.remove('error');
      const errEl = input.parentElement.querySelector('.form-error');
      if (errEl) errEl.classList.remove('visible');
    };
    contactForm.querySelectorAll('input, select, textarea').forEach(field => {
      field.addEventListener('input', () => clearError(field));
    });
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let valid = true;
      const name    = contactForm.querySelector('#name');
      const email   = contactForm.querySelector('#email');
      const message = contactForm.querySelector('#message');
      if (name    && !name.value.trim())    { showError(name,    'Please enter your full name');    valid = false; }
      if (email) {
        if (!email.value.trim())            { showError(email,   'Please enter your email address'); valid = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) { showError(email, 'Please enter a valid email'); valid = false; }
      }
      if (message && !message.value.trim()) { showError(message, 'Please enter your message');      valid = false; }
      if (!valid) return;

      const submitBtn = contactForm.querySelector('[type="submit"]');
      if (submitBtn) { submitBtn.textContent = 'Sending...'; submitBtn.disabled = true; }

      try {
        const payload = {};
        new FormData(contactForm).forEach((v, k) => { payload[k] = v; });
        const res  = await fetch('/api/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.ok) {
          contactForm.style.display = 'none';
          const success = document.querySelector('.form-success');
          if (success) success.classList.add('visible');
        } else {
          if (submitBtn) { submitBtn.textContent = 'Send My Message'; submitBtn.disabled = false; }
        }
      } catch (_) {
        if (submitBtn) { submitBtn.textContent = 'Send My Message'; submitBtn.disabled = false; }
      }
    });
  }

  /* ── Newsletter / Email Forms — POST to API ── */
  document.querySelectorAll('.email-form, .footer-newsletter form').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      const btn   = form.querySelector('button');
      if (!input || !input.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        if (input) { input.style.border = '2px solid #EF4444'; setTimeout(() => { input.style.border = ''; }, 2000); }
        return;
      }
      const originalText = btn ? btn.textContent : '';
      if (btn) { btn.textContent = 'Sending...'; btn.disabled = true; }
      try {
        const res = await fetch('/api/subscribers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: input.value.trim(), source: 'website' })
        });
        const data = await res.json();
        if (btn) { btn.textContent = data.ok ? 'Subscribed!' : 'Try Again'; btn.style.background = data.ok ? '#10B981' : '#EF4444'; }
        input.value = '';
        setTimeout(() => {
          if (btn) { btn.textContent = originalText; btn.style.background = ''; btn.disabled = false; }
        }, 4000);
      } catch (_) {
        if (btn) { btn.textContent = originalText; btn.disabled = false; }
      }
    });
  });

  /* ── Smooth Scroll for Anchor Links ── */
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', (e) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* ── Video Reel Click ── */
  const videoWrap = document.querySelector('.video-reel-wrap');
  if (videoWrap) {
    videoWrap.addEventListener('click', () => {
      const placeholder = videoWrap.querySelector('.video-reel-placeholder');
      if (placeholder) {
        placeholder.innerHTML = `
          <p style="color:rgba(255,255,255,0.6);font-size:1.1rem;">
            🎥 Your speaking reel video would play here.<br>
            <small>Embed a YouTube or Vimeo link to activate.</small>
          </p>`;
      }
    });
  }

  /* ── Book Cover Hover 3D ── */
  const bookCover = document.querySelector('.book-cover-3d');
  if (bookCover) {
    bookCover.addEventListener('mousemove', (e) => {
      const rect = bookCover.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      bookCover.style.transform = `perspective(1000px) rotateY(${x * 20 - 10}deg) rotateX(${-y * 10}deg) translateY(-5px)`;
    });
    bookCover.addEventListener('mouseleave', () => {
      bookCover.style.transform = 'perspective(1000px) rotateY(-15deg)';
    });
  }

})();
