/* Syfrows: the HubSpot meetings widget, embedded so the visitor never leaves
   the site. HubSpot posts a message to the parent window when a booking goes
   through; we swap the widget for our own confirmation instead of stranding
   people on HubSpot's hosted page. */
(function () {
  var embed = document.getElementById('sy-book-embed');
  var done = document.getElementById('sy-book-done');
  if (!embed || !done) return;

  // Load HubSpot's embed script only on pages that actually use it.
  if (!document.querySelector('script[data-hs-meetings]')) {
    var s = document.createElement('script');
    s.src = 'https://static.hsappstatic.net/MeetingsEmbed/ev1/static/MeetingsEmbedCode.js';
    s.async = true;
    s.setAttribute('data-hs-meetings', '1');
    document.body.appendChild(s);
  }

  /* If HubSpot's widget does not appear - script blocked, network trouble,
     an extension - show a direct link rather than leaving a blank page where
     the booking form should be. */
  var BOOKING_URL = 'https://meetings-na2.hubspot.com/syfrows-digital-services-agency';
  setTimeout(function () {
    if (embed.hidden) return;
    if (embed.querySelector('iframe')) return;
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
  }, 8000);

  function booked() {
    if (done.hidden === false) return;
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
    // Only trust messages from HubSpot's own frames.
    var host;
    try { host = new URL(e.origin).hostname; } catch (err) { return; }
    if (!/(^|\.)hubspot\.com$/.test(host) && !/(^|\.)hsappstatic\.net$/.test(host)) return;

    var d = e.data;
    if (!d) return;
    if (d === 'meetingBookSucceeded') return booked();
    if (typeof d === 'object') {
      if (d.meetingBookSucceeded === true) return booked();
      if (d.meetingsPayload && d.meetingsPayload.bookingResponse) return booked();
      if (d.eventName === 'meetingBookSucceeded') return booked();
    }
  });
})();
