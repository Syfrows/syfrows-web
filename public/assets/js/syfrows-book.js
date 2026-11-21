/* Syfrows: the booking calendar, embedded so the visitor never leaves the site.
   The iframe is in the markup rather than built by HubSpot's embed script,
   which was being blocked and left the page empty. This file only does two
   things: swap in our own confirmation when HubSpot says a booking went
   through, and show a direct link if the iframe never loads. */
(function () {
  var embed = document.getElementById('sy-book-embed');
  var frame = document.getElementById('sy-book-frame');
  var done = document.getElementById('sy-book-done');
  if (!embed || !frame || !done) return;

  var BOOKING_URL = 'https://meetings-na2.hubspot.com/syfrows-digital-services-agency';
  var loaded = false;
  var finished = false;

  frame.addEventListener('load', function () { loaded = true; });

  function fallback() {
    if (loaded || finished || embed.hidden) return;
    frame.style.display = 'none';
    var box = document.createElement('div');
    box.className = 'sy-book-fallback';
    box.innerHTML = '<p>The booking calendar could not load here, which is usually a browser extension or network filter.</p>' +
      '<p><a class="btn" href="' + BOOKING_URL + '" target="_blank" rel="noopener">Open the booking page <span></span></a></p>' +
      '<p class="sy-book-alt">Or email <a href="mailto:info@syfrows.com">info@syfrows.com</a> and we will send you times.</p>';
    embed.appendChild(box);
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'book_embed_failed' });
    } catch (e) {}
  }
  setTimeout(fallback, 12000);

  function booked() {
    if (finished) return;
    finished = true;
    embed.hidden = true;
    done.hidden = false;
    done.scrollIntoView({ block: 'center', behavior: 'smooth' });
    try {
      if (typeof gtag === 'function') {
        gtag('event', 'book_call_completed', { send_to: 'G-J68BRDSGJ0' });
      }
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'book_call_completed' });
    } catch (e) {}
  }

  window.addEventListener('message', function (e) {
    var host;
    try { host = new URL(e.origin).hostname; } catch (err) { return; }
    if (!/(^|\.)hubspot\.com$/.test(host) && !/(^|\.)hsappstatic\.net$/.test(host)) return;

    var d = e.data;
    if (!d) return;

    // HubSpot asks the parent to resize the frame as the booking flow moves on.
    if (typeof d === 'object') {
      var h = d.meetingsFrameHeight || d.height ||
              (d.meetingBookSucceeded ? null : (d.payload && d.payload.height));
      if (h && !isNaN(h) && h > 200) frame.style.height = Math.ceil(h) + 'px';
    }

    if (d === 'meetingBookSucceeded') return booked();
    if (typeof d === 'object') {
      if (d.meetingBookSucceeded === true) return booked();
      if (d.meetingsPayload && d.meetingsPayload.bookingResponse) return booked();
      if (d.eventName === 'meetingBookSucceeded') return booked();
    }
  });
})();
