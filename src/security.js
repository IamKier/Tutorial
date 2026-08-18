// ============================================================================
// security.js — HEADERS, RATE LIMITING, CSRF
// ============================================================================
//
// Measures that do nothing visible on localhost and are working every second
// once the app is reachable by anyone else.
// ============================================================================

import { HttpError, clientIp } from './http.js';
import { WRITE_RATE_LIMIT, WRITE_RATE_WINDOW_MS, TRUST_PROXY } from './config.js';

// ---------------------------------------------------------------------------
// SECURITY HEADERS
//
// Sent on every response. Each closes off a category of attack, and all of
// them are free.
// ---------------------------------------------------------------------------

/**
 * Content-Security-Policy is the important one. It tells the browser which
 * sources it may load code from, so even if an attacker gets a script tag onto
 * the page, the browser refuses to run it.
 *
 * `'self'` everywhere means: only files from this origin. No CDNs, no inline
 * scripts, no `eval`. That strictness is why the theme script lives in
 * boot.js rather than inline — the usual workaround, 'unsafe-inline', throws
 * away most of the protection you came for.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  // The example previews carry their own <style>; see netlify.toml for the
  // reasoning on why loosening style-src is a very different proposition from
  // loosening script-src.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  // JavaScript examples run in a Worker created from a blob.
  'worker-src blob:',
  // HTML examples render in a sandboxed iframe.
  "frame-src 'self'",
  "object-src 'none'",
  // Restricts what an injected <base href> could rewrite — otherwise it can
  // redirect every relative URL on the page.
  "base-uri 'self'",
  "form-action 'self'",
  // Nobody may put this page in an iframe. Stops clickjacking, where the real
  // page is layered invisibly under a decoy.
  "frame-ancestors 'none'",
].join('; ');

export function securityHeaders(isSecure) {
  const headers = {
    'Content-Security-Policy': CSP,

    // Without this, a browser may guess a file's type from its contents and
    // execute an uploaded image as script. Never guess.
    'X-Content-Type-Options': 'nosniff',

    // Do not leak our URLs to other sites in the Referer header.
    'Referrer-Policy': 'same-origin',

    // The older, cruder version of frame-ancestors. Still worth sending.
    'X-Frame-Options': 'DENY',

    // Nothing here needs a camera, a microphone or a location.
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  };

  if (isSecure) {
    // Once a browser has seen this, it refuses to talk to this host over plain
    // HTTP for two years — closing the window where someone on the same
    // network can intercept the first, unencrypted request.
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
// With no login there is no password to brute-force, so this is not about
// guessing — it is about one script being unable to fill the database or
// saturate the server by accident.
//
// The ceiling is deliberately high enough that a person could never reach it
// and low enough that a runaway loop is stopped. Counters live in memory, so
// they reset on restart and do not work across several servers; for a single
// instance that is genuinely useful, and if you scale out, move this to the
// proxy.
// ---------------------------------------------------------------------------

const attempts = new Map();

/** Count one write for this IP. Throws 429 when over the limit. */
export function rateLimitWrites(req) {
  // Reading is unlimited: it creates nothing and costs almost nothing.
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return;

  const ip = clientIp(req, TRUST_PROXY);
  const now = Date.now();
  const record = attempts.get(ip);

  if (!record || now > record.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WRITE_RATE_WINDOW_MS });
    return;
  }

  record.count++;

  if (record.count > WRITE_RATE_LIMIT) {
    const seconds = Math.ceil((record.resetAt - now) / 1000);
    throw new HttpError(429, `Too many requests. Try again in ${seconds} seconds.`);
  }
}

/**
 * Drop expired counters so the Map cannot grow without bound.
 *
 * Skipping this is a slow memory leak: every IP that ever wrote would be
 * remembered forever, which is itself a way to bring the server down.
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

  // Without unref(), this timer would keep the process alive and Ctrl+C would
  // appear to hang until the next tick.
  timer.unref();
  return timer;
}

// ---------------------------------------------------------------------------
// CSRF
// ---------------------------------------------------------------------------

/**
 * Reject state-changing requests that are not JSON.
 *
 * Cross-site request forgery is when a malicious page submits a hidden form to
 * our API using your browser. An HTML form can only send three content types,
 * and application/json is not one of them; sending JSON cross-origin requires
 * a preflight request, which this server never approves because it sends no
 * CORS headers.
 *
 * DELETE is exempt because it carries no body — and a form cannot produce a
 * DELETE at all, so there is nothing to forge.
 */
export function requireJsonContentType(req) {
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) return;

  const contentType = req.headers['content-type'] ?? '';

  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Content-Type must be application/json');
  }
}
