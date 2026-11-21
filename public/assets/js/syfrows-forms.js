/* Syfrows: send every website form to email (FormSubmit) and track it in GA4 / GTM.
   HubSpot's tracking code (loaded separately) also captures these submissions as CRM contacts.
   Every form gets a honeypot field injected at init; anything that fills it is a bot,
   and its submission is dropped while still showing the normal success message. */
(function () {
  var ENDPOINT = "https://formsubmit.co/ajax/syfrows@gmail.com";
  var HP_ID = 0;

  function fieldName(el) {
    if (el.name) return el.name;
    var n = el.id || (el.placeholder || el.type || "field").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
    if (el.type === "email") n = "email";
    el.name = n;
    return n;
  }

  function message(form, text, ok) {
    var box = form.querySelector(".sf-msg");
    if (!box) {
      box = document.createElement("p");
      box.className = "sf-msg";
      box.setAttribute("role", "status");
      box.style.cssText = "margin:12px 0 0;font-weight:600;width:100%";
      form.appendChild(box);
    }
    box.style.color = ok ? "#1aa34a" : "#d93025";
    box.textContent = text;
  }

  /* Forms that own their own submit handling elsewhere. Without this, the
     catch-all below would bind a second handler to them, so one enquiry would
     send two emails and fire generate_lead twice. */
  var OWNED_ELSEWHERE = ".sy-qual-form, .sy-wa-form";

  function init(form) {
    if (form.dataset.sfReady) return;
    if (form.matches(OWNED_ELSEWHERE)) return;
    form.dataset.sfReady = "1";
    var isNewsletter = !!form.closest(".newsletter-form, .footer-newsletter") || form.querySelectorAll("input,textarea").length === 1;
    form.querySelectorAll("input,textarea,select").forEach(function (el) {
      if (el.type === "hidden" || el.type === "submit") return;
      fieldName(el);
      if (el.type === "email") el.required = true;
    });
    form.setAttribute("action", ENDPOINT);
    form.setAttribute("method", "POST");

    // Honeypot. Off-screen, hidden from screen readers and skipped by tabbing,
    // so only a script that fills every field will touch it.
    if (!form.querySelector("[name=website_url_confirm]")) {
      var hp = document.createElement("div");
      hp.className = "sy-hp";
      hp.setAttribute("aria-hidden", "true");
      hp.innerHTML = '<label for="sf_hp_' + HP_ID + '">Leave this field empty</label>' +
        '<input type="text" id="sf_hp_' + HP_ID + '" name="website_url_confirm" tabindex="-1" autocomplete="off">';
      HP_ID++;
      form.appendChild(hp);
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"],button:not([type])');
      // Bot: show the usual confirmation so it does not retry, and send nothing.
      var trap = form.querySelector("[name=website_url_confirm]");
      if (trap && trap.value) {
        message(form, isNewsletter ? "Thanks! You're subscribed." : "Thanks! We'll get back to you within 24 hours.", true);
        form.reset();
        return;
      }

      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== "website_url_confirm") data[k] = v; });
      delete data.access_key;
      data._subject = isNewsletter ? "New newsletter subscriber - syfrows.com" : "New enquiry from syfrows.com";
      data._template = "table";
      data._captcha = "false";
      data.form_type = isNewsletter ? "Newsletter" : "Enquiry";
      data.page = location.href;
      if (data.email) data._replyto = data.email;
      if (btn) btn.disabled = true;
      message(form, "Sending...", true);

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json(); })
        .then(function (res) {
          if (String(res.success) !== "true") throw new Error(res.message || "Failed");
          message(form, isNewsletter ? "Thanks! You're subscribed." : "Thanks! We'll get back to you within 24 hours.", true);
          form.reset();
          window.dataLayer = window.dataLayer || [];
          window.dataLayer.push({ event: isNewsletter ? "sign_up" : "generate_lead", form_type: data.form_type });
          if (window.syfrowsTrack) window.syfrowsTrack(isNewsletter ? "sign_up" : "generate_lead", { form_type: data.form_type, page_path: location.pathname });
        })
        .catch(function () {
          message(form, "Something went wrong. Please email info@syfrows.com or call +91 7588071530.", false);
        })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  }

  function run() { document.querySelectorAll("form").forEach(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
