/* Syfrows: send every website form to email (Web3Forms) and track it in GA4 / GTM.
   HubSpot's tracking code (loaded separately) also captures these submissions as CRM contacts. */
(function () {
  var ENDPOINT = "https://formsubmit.co/ajax/syfrows@gmail.com";

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

  function init(form) {
    if (form.dataset.sfReady) return;
    form.dataset.sfReady = "1";
    var isNewsletter = !!form.closest(".newsletter-form, .footer-newsletter") || form.querySelectorAll("input,textarea").length === 1;
    form.querySelectorAll("input,textarea,select").forEach(function (el) {
      if (el.type === "hidden" || el.type === "submit") return;
      fieldName(el);
      if (el.type === "email") el.required = true;
    });
    form.setAttribute("action", ENDPOINT);
    form.setAttribute("method", "POST");

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var btn = form.querySelector('button[type="submit"],button:not([type])');
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
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
        })
        .catch(function () {
          message(form, "Something went wrong. Please email syfrows@gmail.com or call +91 7588071530.", false);
        })
        .finally(function () { if (btn) btn.disabled = false; });
    });
  }

  function run() { document.querySelectorAll("form").forEach(init); }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run); else run();
})();
