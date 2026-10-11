// Shared utilities used across all pages.

function smoothGo(id, offset) {
  var el = document.getElementById(id);
  if (!el) return;
  window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - (offset || 48), behavior: 'smooth' });
}

// Fires a GA4 event via gtag if it's loaded; a silent no-op otherwise (e.g. ad-blocked).
function gaEvent(name, params) {
  if (typeof gtag === 'function') gtag('event', name, params || {});
}

// Fires a `scroll_depth` event the first time the page crosses each threshold.
function initScrollDepthTracking() {
  var thresholds = [25, 50, 75, 90, 100];
  var fired = {};
  function check() {
    var max = document.documentElement.scrollHeight - window.innerHeight;
    if (max <= 0) return;
    var pct = (window.scrollY / max) * 100;
    thresholds.forEach(function (t) {
      if (pct >= t && !fired[t]) {
        fired[t] = true;
        gaEvent('scroll_depth', { percent: t });
      }
    });
  }
  window.addEventListener('scroll', check, { passive: true });
  check();
}

// Highlights the sidebar/nav link whose data-section-id matches the section
// nearest the top of the viewport, and wires each link to smooth-scroll.
// Also fires a `section_reached` event the first time the reader scrolls
// as far as each section, so we can see how far down the page people get.
function initExplorerNav(navSelector, offset) {
  var links = Array.prototype.slice.call(document.querySelectorAll(navSelector));
  if (!links.length) return;

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      smoothGo(link.dataset.sectionId, offset);
    });
  });

  var ids = links.map(function (l) { return l.dataset.sectionId; }).filter(Boolean);
  var maxIdx = -1;

  function update() {
    var cur = ids[0], curIdx = 0;
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      if (el && el.getBoundingClientRect().top < 160) { cur = ids[i]; curIdx = i; }
    }
    links.forEach(function (link) {
      link.classList.toggle('active', link.dataset.sectionId === cur);
    });
    if (curIdx > maxIdx) {
      maxIdx = curIdx;
      gaEvent('section_reached', { section_id: cur, section_index: curIdx + 1, section_count: ids.length });
    }
  }

  window.addEventListener('scroll', update, { passive: true });
  update();
}

function initCopyEmail(btnSelector, email) {
  var btn = document.querySelector(btnSelector);
  if (!btn) return;
  var label = btn.querySelector('.copy-label');
  btn.addEventListener('click', function () {
    if (navigator.clipboard) navigator.clipboard.writeText(email).catch(function () {});
    if (label) {
      label.textContent = 'Copied';
      setTimeout(function () { label.textContent = 'Copy'; }, 1600);
    }
  });
}

// Simple prev/next/dot carousel. root must contain:
//  - elements with [data-slide] (index-matched, toggled via .active)
//  - a caption element [data-carousel-caption]
//  - dot buttons [data-carousel-dot] (index-matched)
//  - optional [data-carousel-prev] / [data-carousel-next] buttons
function initCarousel(root, captions) {
  if (!root) return;
  var slides = Array.prototype.slice.call(root.querySelectorAll('[data-slide]'));
  var dots = Array.prototype.slice.call(root.querySelectorAll('[data-carousel-dot]'));
  var captionEl = root.querySelector('[data-carousel-caption]');
  var prevBtn = root.querySelector('[data-carousel-prev]');
  var nextBtn = root.querySelector('[data-carousel-next]');
  var i = 0;

  function render() {
    slides.forEach(function (s, idx) { s.classList.toggle('active', idx === i); });
    dots.forEach(function (d, idx) { d.classList.toggle('active', idx === i); });
    if (captionEl && captions) captionEl.textContent = captions[i];
  }

  dots.forEach(function (d, idx) {
    d.addEventListener('click', function () { i = idx; render(); });
  });
  if (prevBtn) prevBtn.addEventListener('click', function () { i = (i - 1 + slides.length) % slides.length; render(); });
  if (nextBtn) nextBtn.addEventListener('click', function () { i = (i + 1) % slides.length; render(); });

  render();
}
