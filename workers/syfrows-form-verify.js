/* syfrows-form-verify
 *
 * Sits between the site's forms and FormSubmit. It verifies the Cloudflare
 * Turnstile token with siteverify before passing a submission on, so the
 * widget on /free-audit stops being decorative.
 *
 * Deliberate behaviour around failure:
 *   - If TURNSTILE_SECRET is not configured, the Worker forwards without
 *     verifying. That way deploying this Worker can never silently start
 *     dropping enquiries before the secret is in place.
 *   - If the secret IS configured and the token is missing or rejected, the
 *     submission is refused with a clear message the form shows the visitor,
 *     so they can complete the check and retry rather than lose their enquiry.
 *
 * Environment:
 *   TURNSTILE_SECRET  (secret)   Turnstile secret key for the site key in use
 *   FORM_ENDPOINT     (optional) override the FormSubmit URL
 */

const DEFAULT_ENDPOINT = 'https://formsubmit.co/ajax/syfrows@gmail.com';
const ALLOWED_ORIGINS = ['https://www.syfrows.com', 'https://syfrows.com'];
const MAX_BODY = 64 * 1024;

function cors(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors(origin) },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (request.method !== 'POST') {
      return json({ success: false, message: 'Method not allowed.' }, 405, origin);
    }
    if (origin && !ALLOWED_ORIGINS.includes(origin)) {
      return json({ success: false, message: 'Origin not allowed.' }, 403, origin);
    }

    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return json({ success: false, message: 'Submission too large.' }, 413, origin);
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return json({ success: false, message: 'Could not read the submission.' }, 400, origin);
    }
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return json({ success: false, message: 'Could not read the submission.' }, 400, origin);
    }

    // Honeypot: accept quietly so the bot sees a success and does not retry.
    if (data.website_url_confirm) {
      return json({ success: true }, 200, origin);
    }

    const token = data['cf-turnstile-response'];
    delete data['cf-turnstile-response'];

    const secret = env.TURNSTILE_SECRET;
    if (secret) {
      if (!token) {
        return json(
          {
            success: false,
            message:
              'The security check did not complete. Please wait a moment for it to finish, then send again.',
          },
          400,
          origin
        );
      }

      const form = new FormData();
      form.append('secret', secret);
      form.append('response', token);
      const ip = request.headers.get('CF-Connecting-IP');
      if (ip) form.append('remoteip', ip);

      let verdict;
      try {
        const vr = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          body: form,
        });
        verdict = await vr.json();
      } catch (e) {
        // Cloudflare unreachable: forward rather than lose a real enquiry.
        verdict = { success: true, 'error-codes': ['siteverify-unreachable'] };
      }

      if (!verdict.success) {
        return json(
          {
            success: false,
            message:
              'The security check could not be verified. Please reload the page and try again.',
          },
          400,
          origin
        );
      }
    }

    const endpoint = env.FORM_ENDPOINT || DEFAULT_ENDPOINT;
    let upstream;
    try {
      upstream = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
    } catch (e) {
      return json({ success: false, message: 'Could not deliver the message. Please email info@syfrows.com.' }, 502, origin);
    }

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json', ...cors(origin) },
    });
  },
};
