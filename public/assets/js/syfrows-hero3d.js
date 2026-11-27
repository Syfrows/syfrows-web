/* Interactive hero scene.
 *
 * Three jobs: tilt the deck toward the pointer (or the finger, on touch),
 * redraw the trend line when a metric tab is chosen, and keep every bit of
 * ambient motion off when the visitor has asked for reduced motion, while
 * keeping the tilt: nothing here moves unless a pointer is deliberately moved
 * over it, which is the kind of motion that preference is not aimed at. The
 * tilt is smaller and untweened in that mode. The curves are
 * illustrative shapes, not figures, so nothing here claims a result.
 */
(function () {
  'use strict';

  var stage = document.getElementById('sy-h3d');
  var deck  = document.getElementById('sy-h3d-deck');
  var line  = document.getElementById('sy-h3d-line');
  var area  = document.getElementById('sy-h3d-area');
  var head  = document.getElementById('sy-h3d-head');
  if (!stage || !deck || !line || !area || !head) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Each series is a rising shape across the 400x168 plot. The last point is
     the head of the line, so the marker can sit on it without extra data. */
  var SERIES = [
    'M 6 138 C 60 132 84 118 118 112 S 176 104 212 84 S 268 72 300 50 S 356 34 394 18',
    'M 6 146 C 48 144 78 136 110 124 S 168 118 206 96 S 252 68 296 60 S 350 30 394 24',
    'M 6 132 C 54 128 90 124 122 104 S 168 92 208 90 S 258 60 302 44 S 348 40 394 14'
  ];

  var REST_X = 7, REST_Y = -13;

  function setTilt(rx, ry) {
    deck.style.setProperty('--sy-rx', rx.toFixed(2) + 'deg');
    deck.style.setProperty('--sy-ry', ry.toFixed(2) + 'deg');
  }

  /* ---- drawing ---------------------------------------------------------- */

  function draw(index, animate) {
    var d = SERIES[index] || SERIES[0];
    line.setAttribute('d', d);
    /* The area is the same curve closed along the baseline. */
    area.setAttribute('d', d + ' L 394 168 L 6 168 Z');

    var end = line.getPointAtLength(line.getTotalLength());
    head.setAttribute('cx', end.x);
    head.setAttribute('cy', end.y);

    if (reduce || !animate) {
      line.style.strokeDasharray = 'none';
      line.style.strokeDashoffset = '0';
      stage.classList.add('is-drawn');
      return;
    }

    var len = line.getTotalLength();
    stage.classList.remove('is-drawn');
    line.style.transition = 'none';
    line.style.strokeDasharray = len + ' ' + len;
    line.style.strokeDashoffset = len;
    /* Force a reflow so the browser starts from the undrawn state. */
    void line.getBoundingClientRect();
    line.style.transition = 'stroke-dashoffset 1.15s cubic-bezier(.33,.9,.3,1)';
    line.style.strokeDashoffset = '0';
    stage.classList.add('is-drawn');
  }

  var tabs = [].slice.call(stage.querySelectorAll('.sy-h3d-tab'));
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.classList.toggle('is-on', on);
        t.setAttribute('aria-selected', on ? 'true' : 'false');
      });
      draw(parseInt(tab.dataset.sySeries, 10) || 0, true);
    });
  });

  /* ---- tilt ------------------------------------------------------------- */

  {
    /* Reduced motion gets a shallower tilt and no easing, set by the CSS that
       drops the deck's transition; the gesture still answers, it just does not
       glide. */
    var TILT_X = reduce ? 7 : 16;
    var TILT_Y = reduce ? 9 : 22;
    var raf = null, want = null;

    function apply() {
      raf = null;
      if (want) setTilt(want[0], want[1]);
    }
    function queue(rx, ry) {
      want = [rx, ry];
      if (!raf) raf = requestAnimationFrame(apply);
    }

    function fromPoint(clientX, clientY) {
      var box = stage.getBoundingClientRect();
      var nx = (clientX - box.left) / box.width  - 0.5;   /* -0.5 .. 0.5 */
      var ny = (clientY - box.top)  / box.height - 0.5;
      /* Pointer right tilts the deck toward the pointer, pointer down lifts
         the far edge. Capped so the card never turns away from the reader. */
      queue(REST_X - ny * TILT_X, REST_Y + nx * TILT_Y);
    }

    stage.addEventListener('pointerenter', function () { stage.classList.add('is-live'); });
    stage.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch') return;
      fromPoint(e.clientX, e.clientY);
    });
    stage.addEventListener('pointerleave', function () {
      stage.classList.remove('is-live');
      queue(REST_X, REST_Y);
    });

    /* Touch: drag anywhere on the scene to swing it. Taps still reach the
       tabs because we only take over once the finger has actually moved. */
    var start = null, moved = false;
    stage.addEventListener('touchstart', function (e) {
      var t = e.touches[0]; if (!t) return;
      start = { x: t.clientX, y: t.clientY, rx: REST_X, ry: REST_Y };
      moved = false;
      stage.classList.add('is-live', 'is-touched');
    }, { passive: true });

    stage.addEventListener('touchmove', function (e) {
      var t = e.touches[0]; if (!t || !start) return;
      var dx = t.clientX - start.x, dy = t.clientY - start.y;
      if (!moved && Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      /* Only claim the gesture when it is more sideways than vertical, so a
         plain scroll down the page is never hijacked. */
      if (!moved && Math.abs(dx) < Math.abs(dy)) { start = null; return; }
      moved = true;
      if (e.cancelable) e.preventDefault();
      var ry = Math.max(-34, Math.min(16, start.ry + dx * 0.22));
      var rx = Math.max(-8,  Math.min(22, start.rx - dy * 0.14));
      queue(rx, ry);
    }, { passive: false });

    function release() {
      start = null;
      stage.classList.remove('is-live');
      queue(REST_X, REST_Y);
    }
    stage.addEventListener('touchend', release, { passive: true });
    stage.addEventListener('touchcancel', release, { passive: true });
  }

  /* ---- first paint ------------------------------------------------------ */

  draw(0, false);
  if (!reduce) {
    /* Redraw with the animation once the hero is actually on screen, so the
       line appears to be drawn rather than already finished. */
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) { draw(0, true); io.disconnect(); }
        });
      }, { threshold: 0.25 });
      io.observe(stage);
    } else {
      draw(0, true);
    }
  }
})();
