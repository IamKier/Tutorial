// ============================================================================
// security.js — HEADERS AND RATE LIMITING
// ============================================================================
//
// The measures that only matter once the app is reachable by strangers. On
// localhost none of this does anything visible; on the public internet all of
// it is doing something every second.
// ============================================================================

import { HttpError, clientIp } from './http.js';
import { AUTH_RATE_LIMIT, AUTH_RATE_WINDOW_MS, TRUST_PROXY } from './config.js';

// ---------------------------------------------------------------------------
// SECURITY HEADERS
//
// Sent on every response. Each one closes off a category of attack, and all of
// them are free.
// ---------------------------------------------------------------------------

/**
 * Content-Security-Policy is the important one. It tells the browser which
 * sources it may load code from — so even if an attacker manages to inject a
 * script tag into the page, the browser refuses to run it.
 *
 * `'self'` everywhere means: only files from this origin. No CDNs, no inline
 * scripts, no `eval`. That strictness is why this project moved its two inline
 * scripts into boot.js — an inline `<script>` would be blocked by this policy,
 * and the usual workaround, 'unsafe-inline', throws away most of the
 * protection you came for.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  // The API is same-origin, so nothing needs to reach anywhere else.
  "connect-src 'self'",
  "object-src 'none'",
  // Restricts what <base href> can rewrite — an injected base tag can
  // otherwise redirect every relative URL on the page.
  "base-uri 'self'",
  "form-action 'self'",
  // Nobody may put this page in an iframe. Stops clickjacking, where your real
  // page is layered invisibly under a decoy.
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(isSecure) {
  const headers = {
    'Content-Security-Policy': CSP,

    // Without this, a browser may guess a file's type from its contents and
    // execute an uploaded image as script. Never guess.
    'X-Content-Type-Options': 'nosniff',

    // Do not leak the full URL of our pages to other sites in the Referer
    // header — paths often contain ids.
    'Referrer-Policy': 'same-origin',

    // The older, cruder version of frame-ancestors. Still worth sending.
    'X-Frame-Options': 'DENY',

    // Nothing here needs a camera, a microphone or a location.
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };

  if (isSecure) {
    // Once a browser has seen this, it refuses to talk to this host over plain
    // HTTP for the next two years — which closes the window where someone on
    // the same network can intercept the first, unencrypted request.
    //
    // Only ever send it over HTTPS. Sent from a site you later need on HTTP,
    // it locks you out of your own domain until it expires.
    headers['Strict-Transport-Security'] = 'max-age=63072000; includeSubDomains';
  }

  return headers;
}

// ---------------------------------------------------------------------------
// RATE LIMITING
//
// Without this, a script can try passwords against your login endpoint as fast
// as the network allows. Slow hashing helps, but the only real answer is to
// stop accepting attempts.
//
// This one keeps counters in memory, which means it resets on restart and does
// not work across several servers. For a single instance it is genuinely
// useful; if you scale out, move the counters to Redis or do it at the proxy.
// ---------------------------------------------------------------------------

const attempts = new Map();

/**
 * Count one attempt for this request's IP. Throws 429 when over the limit.
 *
 * A fixed window rather than a sliding one — simpler, and the imprecision at
 * the boundary does not matter when the limit is ten per fifteen minutes.
 */
export function rateLimit(req, { limit = AUTH_RATE_LIMIT, windowMs = AUTH_RATE_WINDOW_MS } = {}) {
  const ip = clientIp(req, TRUST_PROXY);
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + windowMs });
    return;
  }

  record.count++;

  if (record.count > limit) {
    const seconds = Math.ceil((record.resetAt - now) / 1000);
    throw new HttpError(429, `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minutes.`);
  }
}

/** Clear the counter for this IP — called after a successful login. */
export function clearRateLimit(req) {
  attempts.delete(clientIp(req, TRUST_PROXY));
}

/**
 * Drop expired counters so the Map cannot grow without bound.
 *
 * Skipping this is a slow memory leak: every IP that ever hit the login page
 * would be remembered forever, which is itself a way to take the server down.
 */
export function startRateLimitCleanup() {
  const timer = setInterval(
    () => {
      const now = Date.now();
      for (const [ip, record] of attempts) {
        if (now > record.resetAt) attempts.delete(ip);
      }
    },
    10 * 60 * 1000
  );

  timer.unref();
  return timer;
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

/**
 * Reject state-changing requests that are not JSON.
 *
 * Cross-site request forgery works like this: you are logged in here, you
 * visit a malicious page, and it submits a hidden form to our API. The browser
 * helpfully attaches your session cookie and the request succeeds.
 *
 * Two things stop it, and this app uses both:
 *
 *   1. `SameSite=Lax` on the session cookie — the browser will not send it
 *      with a cross-site POST at all. This alone covers modern browsers.
 *   2. This check. An HTML form can only send three content types, and
 *      application/json is not one of them. Sending JSON cross-origin requires
 *      a preflight request, which our server never approves because it sends
 *      no CORS headers.
 *
 * Belt and braces, for about eight lines.
 */
export function requireJsonContentType(req) {
  // Only POST, PUT and PATCH carry bodies here. DELETE is deliberately exempt:
  // it sends nothing, so demanding a Content-Type describing that nothing is
  // just an error waiting to happen.
  //
  // It costs nothing in safety either. An HTML form can only ever issue GET or
  // POST — a cross-site page cannot produce a DELETE at all without fetch or
  // XHR, and those are already blocked by the browser's preflight, because
  // this server sends no CORS headers permitting them.
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return;

  const contentType = req.headers['content-type'] ?? '';

  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
}
