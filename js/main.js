/* ============================================================
   HanumanFitness – main.js  (Clean & Simple)
   Hamburger menu | Sticky header | Smooth scroll | Scroll-spy
   Scroll Animations (IntersectionObserver)
   ============================================================ */

(function () {
  'use strict';

  const hdr      = document.getElementById('hdr');
  const hamBtn   = document.getElementById('hamBtn');
  const mobNav   = document.getElementById('mobNav');
  const navLinks = document.querySelectorAll('.nav-links a');
  const sections = document.querySelectorAll('section[id], footer[id]');

  /* ── Preloader ── */
  const preloader = document.getElementById('preloader');
  const plCounter = document.getElementById('plCounter');
  if (preloader && plCounter) {
    let count = 0;
    const duration = 1800; // ~1.8 seconds
    const intervalTime = 30;
    const steps = duration / intervalTime;
    const increment = 100 / steps;

    const counterInterval = setInterval(function() {
      count += increment;
      if (count >= 100) {
        count = 100;
        clearInterval(counterInterval);
        plCounter.innerText = '100%';
        plCounter.classList.add('fade-out');
        
        // Wait for counter to fade out, then lift the curtain
        setTimeout(function() {
          preloader.classList.add('hide');
          setTimeout(function() { preloader.remove(); }, 800); // 800ms slide-up transition
        }, 400);
      } else {
        plCounter.innerText = Math.floor(count) + '%';
      }
    }, intervalTime);
  }

  /* ── Sticky header ── */
  function onScroll() {
    hdr.classList.toggle('stuck', window.scrollY > 50);
    scrollSpy();
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Hamburger ── */
  hamBtn.addEventListener('click', function () {
    const open = this.classList.toggle('open');
    mobNav.classList.toggle('open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });

  /* Close mobile nav on link click or close button */
  var closeNav = function () {
    hamBtn.classList.remove('open');
    mobNav.classList.remove('open');
    document.body.style.overflow = '';
  };

  mobNav.querySelectorAll('a').forEach(function (a) {
    a.addEventListener('click', closeNav);
  });

  const mobClose = document.getElementById('mobClose');
  if (mobClose) {
    mobClose.addEventListener('click', closeNav);
  }

  /* ── Smooth scroll for all #hash links ── */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id     = this.getAttribute('href');
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      var navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 76;
      var top  = target.getBoundingClientRect().top + window.pageYOffset - navH;
      window.scrollTo({ top: top, behavior: 'smooth' });
    });
  });

  /* ── Scroll-spy ── */
  function scrollSpy() {
    var mid     = window.pageYOffset + window.innerHeight * 0.35;
    var current = '';

    sections.forEach(function (sec) {
      if (sec.offsetTop <= mid) current = sec.id;
    });

    navLinks.forEach(function (a) {
      a.classList.toggle('on', a.getAttribute('href') === '#' + current);
    });
  }

  /* ── Gallery lightbox ── */
  document.querySelectorAll('.g-item').forEach(function (item) {
    item.addEventListener('click', function () {
      var img = this.querySelector('img');
      if (!img) return;

      var overlay = document.createElement('div');
      overlay.style.cssText = [
        'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.94)',
        'display:flex', 'align-items:center', 'justify-content:center',
        'z-index:9999', 'cursor:zoom-out', 'padding:20px'
      ].join(';');

      var big = document.createElement('img');
      big.src = img.src;
      big.style.cssText = [
        'max-width:90vw', 'max-height:90vh', 'object-fit:contain',
        'border-radius:12px', 'box-shadow:0 30px 80px rgba(0,0,0,0.9)'
      ].join(';');

      overlay.appendChild(big);
      document.body.appendChild(overlay);

      overlay.addEventListener('click', function () { this.remove(); });

      document.addEventListener('keydown', function esc(e) {
        if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', esc); }
      });
    });
  });

  /* ── Scroll Animations ── */
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function(entries, obs) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('active');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -10% 0px' });

    document.querySelectorAll('.reveal-up, .reveal-stagger').forEach(function(el) {
      observer.observe(el);
    });
  } else {
    document.querySelectorAll('.reveal-up, .reveal-stagger').forEach(function(el) {
      el.classList.add('active');
    });
  }

  /* ── Custom Cursor ── */
  var cursorDot = document.getElementById('cursorDot');
  var cursorOutline = document.getElementById('cursorOutline');
  if (cursorDot && cursorOutline && window.innerWidth > 1024) {
    var mouseX = 0, mouseY = 0;
    var outlineX = 0, outlineY = 0;
    window.addEventListener('mousemove', function(e) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      cursorDot.style.transform = 'translate3d(calc(' + mouseX + 'px - 50%), calc(' + mouseY + 'px - 50%), 0)';
    });
    function animateCursor() {
      outlineX += (mouseX - outlineX) * 0.15;
      outlineY += (mouseY - outlineY) * 0.15;
      cursorOutline.style.transform = 'translate3d(calc(' + outlineX + 'px - 50%), calc(' + outlineY + 'px - 50%), 0)';
      requestAnimationFrame(animateCursor);
    }
    animateCursor();

    document.querySelectorAll('a, button, input, select, textarea, .g-item, .faq-item').forEach(function(el) {
      el.addEventListener('mouseenter', function() { cursorOutline.classList.add('hovering'); });
      el.addEventListener('mouseleave', function() { cursorOutline.classList.remove('hovering'); });
    });
  }

  /* ── FAQ Accordion ── */
  document.querySelectorAll('.faq-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var item = this.parentElement;
      var content = item.querySelector('.faq-content');
      var isActive = item.classList.contains('active');
      
      document.querySelectorAll('.faq-item').forEach(function(i) {
        i.classList.remove('active');
        if (i.querySelector('.faq-content')) {
          i.querySelector('.faq-content').style.maxHeight = null;
        }
      });
      
      if (!isActive) {
        item.classList.add('active');
        content.style.maxHeight = content.scrollHeight + 'px';
      }
    });
  });

  /* ── Initialize Lucide Icons ── */
  if (window.lucide) {
    window.lucide.createIcons();
  }

})();
