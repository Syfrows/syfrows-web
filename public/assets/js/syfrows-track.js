/* Syfrows: send lead actions to Google Analytics 4 as events (read by the Google tag that GTM loads). */
(function () {
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  function send(name, params) {
    params = params || {};
    params.send_to = "G-J68BRDSGJ0";
    try { window.gtag("event", name, params); } catch (e) {}
  }
  window.syfrowsTrack = send;
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a[href]");
    if (!a) return;
    var href = a.getAttribute("href") || "";
    var label = (a.textContent || "").trim().slice(0, 60);
    var where = a.closest("header") ? "header" : a.closest("footer") ? "footer" : a.closest(".mobile-menu,.tgmobile__menu") ? "mobile_menu" : "page";
    var p = { link_text: label, link_url: href, placement: where, page_path: location.pathname };
    if (/wa\.me|whatsapp/i.test(href)) send("whatsapp_click", p);
    else if (/meetings[^/]*\.hubspot\.com/i.test(href)) send("book_call_click", p);
    else if (/(^|\/)pay(\.html)?($|[?#])/i.test(href)) send("pay_click", p);
    else if (/^tel:/i.test(href)) send("phone_click", p);
    else if (/^mailto:/i.test(href)) send("email_click", p);
    else if (/free-audit/i.test(href)) send("audit_cta_click", p);
  }, true);
})();
