// ============================================================================
// http.js — REQUEST AND RESPONSE HELPERS
// ============================================================================
//
// The small, boring functions every route needs. Writing them once, here,
// means no route can forget a header or a size limit.
// ============================================================================

import { MAX_BODY_BYTES } from './config.js';

/**
 * An error that carries an HTTP status code.
 *
 * This is the pattern that keeps route handlers readable. Instead of returning
 * early from four levels of nesting, a handler throws:
 *
 *     throw new HttpError(404, 'Task not found');
 *
 * and one place — the error handler in server.js — turns it into a response.
 * Anything thrown that is NOT an HttpError is a bug we did not anticipate, and
 * gets a generic 500 so we never leak internals to a stranger.
 */
export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    // byteLength, not string length: an emoji or an accented letter is more
    // than one byte, and a wrong Content-Length leaves the client waiting for
    // data that never arrives.
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

export function sendText(res, status, text) {
  res.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(text),
  });
  res.end(text);
}

export function redirect(res, location) {
  // 303 rather than 302: it tells the browser to follow with GET, which is
  // what you want after a POST.
  res.writeHead(303, { Location: location });
  res.end();
}

/**
 * Collect the request body and parse it as JSON.
 *
 * A body does not arrive all at once — it comes in chunks as they cross the
 * network, so `req` is a stream and we stitch the pieces together.
 */
export async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;

    // Without this cap, one request with an endless body consumes all of the
    // server's memory until the process dies. This is the cheapest
    // denial-of-service there is, so the limit is not optional.
    if (size > MAX_BODY_BYTES) {
      throw new HttpError(413, 'Request body too large');
    }
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};

  try {
    return JSON.parse(raw);
  } catch {
    // A 400, not a 500 — malformed JSON is the caller's mistake, and telling
    // them so saves them debugging our server instead of their client.
    throw new HttpError(400, 'Request body is not valid JSON');
  }
}

/**
 * Was this request made over HTTPS?
 *
 * Behind a reverse proxy the connection to Node itself is plain HTTP, and the
 * proxy reports the original scheme in `x-forwarded-proto`. We only believe
 * that header when configuration says a proxy really is there — see the note
 * in config.js about why trusting it unconditionally is a hole.
 */
export function isSecureRequest(req, trustProxy) {
  if (trustProxy && req.headers['x-forwarded-proto']) {
    return req.headers['x-forwarded-proto'].split(',')[0].trim() === 'https';
  }
  return Boolean(req.socket.encrypted);
}

/**
 * The client's IP address, for rate limiting.
 *
 * `x-forwarded-for` is a comma-separated chain, oldest first, and only the
 * left-most entry is the original client. It is also trivially forged, which
 * is why it is ignored unless a proxy is configured.
 */
export function clientIp(req, trustProxy) {
  if (trustProxy && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}
