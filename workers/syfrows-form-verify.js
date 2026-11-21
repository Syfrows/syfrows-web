/* syfrows-form-verify
 *
 * Sits between the site's forms and FormSubmit, verifying the Cloudflare
 * Turnstile token with siteverify before passing a submission on, so the
 * widget on /free-audit stops being decorative.
 *
 * Failure behaviour is deliberate:
 *   - With no TURNSTILE_SECRET set, it forwards without verifying, so
 *     deploying it can never silently start dropping enquiries.
 *   - If siteverify itself is unreachable, it forwards rather than lose a
 *     real enquiry.
 *   - Only a secret that IS set plus a missing or rejected token refuses the
 *     submission, with a message the form shows so the visitor can retry.
 *
 * Env: TURNSTILE_SECRET (secret), FORM_ENDPOINT (optional override)
 */

const ENDPOINT = 'https://formsubmit.co/ajax/syfrows@gmail.com';
const ORIGINS = ['https://www.syfrows.com', 'https://syfrows.com'];

function cors(o) {
  return {
    'Access-Control-Allow-Origin': ORIGINS.includes(o) ? o : ORIGINS[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

function reply(body, status, o) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(o) },
  });
}

export default {
  async fetch(request, env) {
    const o = request.headers.get('Origin') || '';
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors(o) });
    if (request.method !== 'POST') return reply({ success: false }, 405, o);
    if (o && !ORIGINS.includes(o)) return reply({ success: false }, 403, o);

    let d;
    try {
      d = await request.json();
    } catch (e) {
      return reply({ success: false, message: 'Could not read the submission.' }, 400, o);
    }
    if (!d || typeof d !== 'object') return reply({ success: false, message: 'Could not read the submission.' }, 400, o);

    // Honeypot: answer success so the bot does not retry.
    if (d.website_url_confirm) return reply({ success: true }, 200, o);

    const token = d['cf-turnstile-response'];
    delete d['cf-turnstile-response'];

    const secret = env.TURNSTILE_SECRET;
    if (secret) {
      const msg = 'The security check did not complete. Please reload the page and try again.';
      if (!token) return reply({ success: false, message: msg }, 400, o);
      const fd = new FormData();
      fd.append('secret', secret);
      fd.append('response', token);
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) fd.append('remoteip', ip);
      let v = { success: true };
      try {
        v = await (await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: fd })).json();
      } catch (e) {
        v = { success: true };
      }
      if (!v.success) return reply({ success: false, message: msg }, 400, o);
    }

    let up;
    try {
      up = await fetch(env.FORM_ENDPOINT || ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(d),
      });
    } catch (e) {
      return reply({ success: false, message: 'Could not deliver. Please email info@syfrows.com.' }, 502, o);
    }
    return new Response(await up.text(), {
      status: up.status,
      headers: { 'Content-Type': 'application/json', ...cors(o) },
    });
  },
};
