/* "Explore All Services": swap the carousel for a grid of everything.
 *
 * The slides are already in the page, so nothing is fetched. Swiper is
 * destroyed while the grid is open, because leaving it running on the same
 * nodes means it keeps repositioning elements the grid has re-laid-out, and
 * loop mode duplicates slides, which would show each service twice.
 */
(function () {
  'use strict';

  var btn = document.getElementById('sy-svc-toggle');
  var wrap = document.querySelector('.services-active-sy');
  if (!btn || !wrap) return;

  var LABEL_OPEN = 'Explore All Services';
  var LABEL_SHUT = 'Show Fewer Services';
  var grid = null;
  var open = false;

  function uniqueSlides() {
    /* Loop mode clones slides; the clones carry swiper-slide-duplicate, so
       drop them and keep one of each service. */
    return [].slice.call(wrap.querySelectorAll('.swiper-slide'))
      .filter(function (s) { return !s.classList.contains('swiper-slide-duplicate'); });
  }

  function buildGrid() {
    var g = document.createElement('div');
    g.className = 'sy-svc-grid';
    g.id = 'sy-svc-all';
    /* Focusable only programmatically, so screen reader and keyboard users
       land in the revealed content without a stray ring for mouse users. */
    g.setAttribute('tabindex', '-1');
    uniqueSlides().forEach(function (s) {
      var card = s.firstElementChild;
      if (card) g.appendChild(card.cloneNode(true));
    });
    return g;
  }

  btn.addEventListener('click', function () {
    open = !open;

    if (open) {
      grid = buildGrid();
      if (wrap.swiper) wrap.swiper.destroy(true, true);
      wrap.style.display = 'none';
      wrap.parentNode.insertBefore(grid, wrap.nextSibling);
      /* Let the browser paint the grid before animating it in. */
      requestAnimationFrame(function () { grid.classList.add('is-in'); });
      btn.textContent = LABEL_SHUT;
      btn.appendChild(document.createElement('span'));
      btn.setAttribute('aria-expanded', 'true');
      grid.focus({ preventScroll: true });
      return;
    }

    if (grid && grid.parentNode) grid.parentNode.removeChild(grid);
    grid = null;
    wrap.style.display = '';
    btn.textContent = LABEL_OPEN;
    btn.appendChild(document.createElement('span'));
    btn.setAttribute('aria-expanded', 'false');
    btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
    /* Rebuild the carousel the same way main.js first created it. */
    if (window.Swiper) {
      /* These options mirror main.js exactly. If that config changes, change
         it here too, or closing the grid will quietly rebuild a different
         carousel from the one the page started with. */
      var n = uniqueSlides().length;
      new window.Swiper('.services-active-sy', {
        loop: n > 3,
        slidesPerView: 1,
        spaceBetween: 24,
        autoplay: { delay: 3200, disableOnInteraction: false, pauseOnMouseEnter: true },
        pagination: { el: '.services-active-sy .swiper-pagination', clickable: true },
        breakpoints: {
          '992': { slidesPerView: Math.min(3, n) },
          '768': { slidesPerView: Math.min(3, n) },
          '576': { slidesPerView: Math.min(2, n) },
          '0': { slidesPerView: Math.min(2, n), spaceBetween: 12 },
        },
      });
    }
  });
})();
