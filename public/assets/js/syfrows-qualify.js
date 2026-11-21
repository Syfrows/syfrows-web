/* Syfrows: three-step lead qualification.
   Step 1 goal, step 2 company and revenue, step 3 budget and contact.
   A budget of $3,000 or more lands on the booking screen; anything lower
   gets a polite audit-by-email reply instead. Submissions go through the
   syfrows-form-verify Worker, which checks the Cloudflare Turnstile token
   before forwarding to FormSubmit. A honeypot drops bot fills.
   Turnstile switches itself on as soon as a site key is set on
   .sy-turnstile[data-sitekey]. */
(function () {
  /* REVERTED to FormSubmit on 2026-11-22: the Turnstile widget was returning
     "Verification failed" for real visitors, so routing through the verifying
     Worker was refusing genuine enquiries. Restore the Worker endpoint only
     once the widget is confirmed working. */
  var ENDPOINT = 'https://formsubmit.co/ajax/syfrows@gmail.com';

  function track(name, params) {
    try {
      params = params || {};
      params.send_to = 'G-J68BRDSGJ0';
      if (typeof gtag === 'function') gtag('event', name, params);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: name }, params));
    } catch (e) {}
  }

  function loadTurnstile(box) {
    var key = box && box.getAttribute('data-sitekey');
    if (!key) return false;
    if (!document.querySelector('script[data-turnstile]')) {
      var sc = document.createElement('script');
      sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      sc.async = true; sc.defer = true; sc.setAttribute('data-turnstile', '1');
      document.head.appendChild(sc);
    }
    box.className += ' cf-turnstile';
    return true;
  }

  function init(root) {
    var form = root.querySelector('.sy-qual-form');
    if (!form || form.dataset.ready) return;
    form.dataset.ready = '1';

    var steps = [].slice.call(form.querySelectorAll('.sy-step'));
    var crumbs = [].slice.call(root.querySelectorAll('.sy-qual-steps li'));
    var done = form.querySelector('.sy-qual-done');
    var booking = root.getAttribute('data-hubspot');
    var at = 0;

    loadTurnstile(form.querySelector('.sy-turnstile'));

    function show(i) {
      at = i;
      steps.forEach(function (s, n) { s.classList.toggle('is-active', n === i); });
      crumbs.forEach(function (c, n) { c.classList.toggle('is-on', n <= i); });
      var top = root.getBoundingClientRect().top + window.pageYOffset - 110;
      if (window.pageYOffset > top) window.scrollTo(0, top);
      var first = steps[i].querySelector('input:not([type=radio]), input[type=radio]');
      if (first && i > 0) first.focus({ preventScroll: true });
    }

    function valid(step) {
      var ok = true;
      step.querySelectorAll('[required]').forEach(function (el) {
        if (el.type === 'radio') {
          var group = step.querySelectorAll('input[name="' + el.name + '"]');
          var any = [].slice.call(group).some(function (r) { return r.checked; });
          if (!any) ok = false;
          group[0].closest('.sy-choices').classList.toggle('is-bad', !any);
        } else if (!el.checkValidity()) {
          ok = false; el.classList.add('is-bad');
        } else {
          el.classList.remove('is-bad');
        }
      });
      return ok;
    }

    form.addEventListener('click', function (e) {
      var next = e.target.closest('.sy-next');
      var back = e.target.closest('.sy-back');
      if (next) {
        if (!valid(steps[at])) return;
        track('qualify_step', { step: at + 1 });
        show(Math.min(at + 1, steps.length - 1));
      }
      if (back) show(Math.max(at - 1, 0));
    });

    form.addEventListener('change', function (e) {
      if (e.target.type === 'radio') {
        var wrap = e.target.closest('.sy-choices');
        if (wrap) wrap.classList.remove('is-bad');
      }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (form.querySelector('[name=website_url_confirm]').value) return; // bot
      if (!valid(steps[at])) return;

      /* The Turnstile token rides along in the payload. The Worker is what
         accepts or refuses it; if it refuses, the message it returns is shown
         below and the visitor can retry. Nothing is decided here. */

      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== 'website_url_confirm') data[k] = v; });
      data._subject = 'Qualified enquiry: ' + (data.goal || 'Syfrows');
      var chosen = form.querySelector('input[name=budget]:checked');
      var high = chosen && chosen.getAttribute('data-tier') === 'high';

      var btn = form.querySelector('button[type=submit]');
      btn.disabled = true; btn.style.opacity = '.6';

      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data)
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          return { ok: res.ok, body: body };
        });
      }).catch(function () {
        // Could not reach the endpoint at all. Telling the visitor beats a
        // false "thanks" that silently loses the enquiry.
        return { ok: false, body: {} };
      }).then(function (r) {
        if (!r.ok) {
          btn.disabled = false; btn.style.opacity = '';
          var warn = form.querySelector('.sy-send-warn');
          if (!warn) {
            warn = document.createElement('p');
            warn.className = 'sy-qual-note sy-send-warn';
            warn.setAttribute('role', 'alert');
            warn.style.color = '#d93025';
            btn.parentNode.parentNode.insertBefore(warn, btn.parentNode.nextSibling);
          }
          warn.textContent = r.body.message || 'That did not send. Please try again, or email info@syfrows.com and we will pick it up from there.';
          return;
        }
        track('generate_lead', { budget: data.budget || '', goal: data.goal || '' });
        steps.forEach(function (s) { s.classList.remove('is-active'); });
        root.querySelector('.sy-qual-steps').style.display = 'none';
        done.hidden = false;
        if (high && booking) {
          done.innerHTML = '<h3>Thanks, ' + (data.name || '').split(' ')[0] +
            '. Pick a time that suits you.</h3><p>We have your details. Choose a slot and we will come to the call having looked at ' +
            (data.company_website || 'your site') + '.</p>' +
            '<p><a class="btn" href="' + booking + '" target="_blank" rel="noopener">Choose a time <span></span></a></p>';
          track('book_call_click', { source: 'qualify_form' });
        } else {
          done.innerHTML = '<h3>Thanks, ' + (data.name || '').split(' ')[0] + '.</h3>' +
            '<p>We will review ' + (data.company_website || 'your site') +
            ' and email you a short audit with the quick wins we find, within one business day.</p>' +
            '<p>If the scope grows later, reply to that email and we will set up a call.</p>';
        }
        done.scrollIntoView({ block: 'center' });
      });
    });

    show(0);
  }

  function boot() {
    document.querySelectorAll('.sy-qual').forEach(init);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();

/* WhatsApp widget: ask for a name and a service before handing over, so the
   number does not collect one-word pings from bots and bounced traffic. */
(function () {
  var trigger = document.querySelector('.sy-chat');
  var modal = document.getElementById('sy-wa-modal');
  if (!trigger || !modal) return;
  var base = trigger.getAttribute('href').split('?')[0];
  var form = modal.querySelector('.sy-wa-form');
  var last = null;

  function open(e) {
    e.preventDefault();
    last = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var f = modal.querySelector('input[name=wa_name]');
    if (f) f.focus();
  }
  function close() {
    modal.hidden = true;
    document.body.style.overflow = '';
    if (last) last.focus();
  }

  trigger.addEventListener('click', open);
  modal.addEventListener('click', function (e) { if (e.target.hasAttribute('data-close')) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (form.querySelector('[name=website_url_confirm]').value) { close(); return; }
    var name = form.wa_name.value.trim();
    var svc = form.wa_service.value;
    if (!name || !svc) return;
    var msg = 'Hi Syfrows, this is ' + name + '. I would like to talk about ' + svc.toLowerCase() + '.';
    try {
      if (typeof gtag === 'function') gtag('event', 'whatsapp_click', { send_to: 'G-J68BRDSGJ0', service: svc });
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'whatsapp_click', service: svc });
    } catch (err) {}
    window.open(base + '?text=' + encodeURIComponent(msg), '_blank', 'noopener');
    close();
    form.reset();
  });
})();
