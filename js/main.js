/* R. Courtney Painting — Paintly-Inspired Scripts v2 */

document.addEventListener('DOMContentLoaded', () => {

  // --- Sticky navbar ---
  const navbar = document.querySelector('.navbar');
  if (navbar) {
    window.addEventListener('scroll', () => {
      navbar.classList.toggle('scrolled', window.scrollY > 40);
    });
  }

  // --- Mobile hamburger ---
  const hamburger = document.querySelector('.hamburger');
  const mobileNav = document.querySelector('.mobile-nav');
  if (hamburger && mobileNav) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileNav.classList.toggle('open');
    });
    mobileNav.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileNav.classList.remove('open');
      });
    });
  }

  // --- Hero slider ---
  const slides = document.querySelectorAll('.hero__slide');
  if (slides.length > 1) {
    let current = 0;
    setInterval(() => {
      slides[current].classList.remove('active');
      current = (current + 1) % slides.length;
      slides[current].classList.add('active');
    }, 6000);
  }

  // --- FAQ accordion ---
  document.querySelectorAll('.faq-item__question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!wasOpen) item.classList.add('open');
    });
  });

  // --- Animated number counters (Paintly style) ---
  const counters = document.querySelectorAll('.counter');
  const animateCounter = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    const suffix = el.getAttribute('data-suffix') || '';
    const duration = 2000;
    const start = performance.now();

    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = Math.floor(eased * target);
      el.textContent = value.toLocaleString() + suffix;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target.toLocaleString() + suffix;
      }
    };
    requestAnimationFrame(step);
  };

  // --- Scroll fade-in + counter trigger ---
  const faders = document.querySelectorAll('.fade-in');
  const counterElements = document.querySelectorAll('.counter');
  const counterAnimated = new Set();

  if ('IntersectionObserver' in window) {
    // Fade-in observer
    const fadeObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    faders.forEach(el => fadeObs.observe(el));

    // Counter observer
    const counterObs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !counterAnimated.has(entry.target)) {
          counterAnimated.add(entry.target);
          animateCounter(entry.target);
          counterObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    counterElements.forEach(el => counterObs.observe(el));
  } else {
    faders.forEach(el => el.classList.add('visible'));
    counterElements.forEach(el => {
      const target = el.getAttribute('data-target');
      const suffix = el.getAttribute('data-suffix') || '';
      el.textContent = parseInt(target, 10).toLocaleString() + suffix;
    });
  }

  // --- Testimonial slider (if multiple testimonials) ---
  const testimonialSlides = document.querySelectorAll('.testimonial-slide');
  if (testimonialSlides.length > 1) {
    let tCurrent = 0;
    setInterval(() => {
      testimonialSlides[tCurrent].style.opacity = '0';
      testimonialSlides[tCurrent].style.position = 'absolute';
      tCurrent = (tCurrent + 1) % testimonialSlides.length;
      testimonialSlides[tCurrent].style.opacity = '1';
      testimonialSlides[tCurrent].style.position = 'relative';
    }, 7000);
  }

});
