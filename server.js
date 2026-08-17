// ============================================================================
// server.js — THE ENTRY POINT
// ============================================================================
//
// This file does one thing: wire the pieces together and start listening.
// All the actual work lives in src/, one concern per file:
//
//   src/config.js       settings, from the environment
//   src/http.js         request/response helpers
//   src/router.js       method + path -> handler
//   src/static.js       serving files
//   src/security.js     headers, rate limiting, CSRF
//   src/db/             the database and its queries
//   src/auth/           password hashing and sessions
//   src/routes/         the API handlers
//
// Run it:  node server.js
// Watch:   npm run dev
// ============================================================================

import http from 'node:http';
import { PORT, IS_PRODUCTION, TRUST_PROXY, SESSION_COOKIE } from './src/config.js';
import { HttpError, sendJson, sendText, parseCookies, isSecureRequest } from './src/http.js';
import { createRouter } from './src/router.js';
import { serveStatic } from './src/static.js';
import { securityHeaders, requireJsonContentType, startRateLimitCleanup } from './src/security.js';
import { getSession, startSessionCleanup } from './src/auth/session.js';
import { closeDatabase } from './src/db/index.js';
import * as authRoutes from './src/routes/auth.js';
import * as taskRoutes from './src/routes/tasks.js';

// ----------------------------------------------------------------------------
// ROUTES
// ----------------------------------------------------------------------------

/**
 * Wrap a handler so it only runs for a signed-in user.
 *
 * Doing it here, at the point each route is declared, means protection is
 * visible in the route table — you can read the list below and see exactly
 * which endpoints are public. A check buried inside each handler is one you
 * can forget to write.
 */
function requireAuth(handler) {
  return async (req, res, ctx) => {
    if (!ctx.user) throw new HttpError(401, 'Sign in to continue');
    return handler(req, res, ctx);
  };
}

const router = createRouter();

// Public
router.post('/api/auth/register', authRoutes.register);
router.post('/api/auth/login', authRoutes.login);
router.post('/api/auth/logout', authRoutes.logout);
router.get('/api/auth/me', authRoutes.me);

// A cheap endpoint for a load balancer or uptime monitor to poll.
router.get('/api/health', async (req, res) => sendJson(res, 200, { ok: true }));

// Protected
router.get('/api/tasks', requireAuth(taskRoutes.list));
router.post('/api/tasks', requireAuth(taskRoutes.create));
router.delete('/api/tasks', requireAuth(taskRoutes.clearCompleted));
router.patch('/api/tasks/:id', requireAuth(taskRoutes.update));
router.delete('/api/tasks/:id', requireAuth(taskRoutes.remove));
router.post('/api/tasks/:id/undo', requireAuth(taskRoutes.undo));

// ----------------------------------------------------------------------------
// THE REQUEST HANDLER
// ----------------------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const startedAt = Date.now();

  // req.url is only a path and query — no protocol or host — so the URL
  // constructor needs a base. Parsing properly gives us pathname and
  // searchParams instead of splitting strings by hand.
  const url = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);
  const secure = isSecureRequest(req, TRUST_PROXY);

  // Security headers go on every response, including errors — an error page is
  // still a page an attacker can try to use.
  for (const [name, value] of Object.entries(securityHeaders(secure))) {
    res.setHeader(name, value);
  }

  try {
    // Resolve the session once, before routing, so every handler can rely on
    // ctx.user without each one repeating the lookup.
    const cookies = parseCookies(req);
    const sessionId = cookies[SESSION_COOKIE];
    const session = getSession(sessionId);

    const ctx = {
      url,
      params: {},
      sessionId,
      user: session ? { id: session.userId, email: session.email } : null,
    };

    if (url.pathname.startsWith('/api/')) {
      // Anything that changes state must arrive as JSON. See the note in
      // security.js — this is half of the CSRF defence.
      requireJsonContentType(req);

      const match = router.match(req.method, url.pathname);

      if (!match) {
        // Distinguish "no such path" from "wrong verb for this path". A 404
        // where a 405 belongs sends people looking for a typo that is not
        // there.
        const allowed = router.allowedMethods(url.pathname);

        if (allowed.length > 0) {
          res.setHeader('Allow', allowed.join(', '));
          throw new HttpError(405, `${req.method} is not allowed on this path`);
        }

        throw new HttpError(404, 'Unknown endpoint');
      }

      ctx.params = match.params;
      await match.handler(req, res, ctx);
    } else {
      // Everything else is a file from dist/, or the single-page-app fallback.
      await serveStatic(req, res, url.pathname);
    }
  } catch (err) {
    handleError(err, req, res);
  } finally {
    // One log line per request. In production you would want structured JSON
    // here so a log aggregator can query it, but this is enough to see what is
    // happening while you build.
    const ms = Date.now() - startedAt;
    console.log(`${req.method} ${url.pathname} ${res.statusCode} ${ms}ms`);
  }
});

/**
 * Turn any thrown value into a response.
 *
 * The distinction that matters: an HttpError is something we raised
 * deliberately and its message is safe to show. Anything else is a bug we did
 * not anticipate, and its message may contain file paths, SQL or internals —
 * so it gets logged here and a generic sentence goes to the caller.
 */
function handleError(err, req, res) {
  const isKnown = err instanceof HttpError;
  const status = isKnown ? err.status : 500;

  if (!isKnown) {
    console.error(`  unhandled error on ${req.method} ${req.url}:`, err);
  }

  // Trying to respond twice throws. If a handler already began sending, the
  // only thing left to do is close the connection.
  if (res.headersSent) {
    res.end();
    return;
  }

  const message = isKnown ? err.message : 'Something went wrong';

  if (req.url?.startsWith('/api/')) {
    sendJson(res, status, { error: message });
  } else {
    sendText(res, status, `${status} ${message}`);
  }
}

// ----------------------------------------------------------------------------
// STARTUP AND SHUTDOWN
// ----------------------------------------------------------------------------

server.on('error', (err) => {
  // Without this handler, a busy port produces an unhandled exception and a
  // wall of Node internals. This is the same information, in a sentence.
  if (err.code === 'EADDRINUSE') {
    console.error(`\n  Port ${PORT} is already in use.`);
    console.error(`  Either stop what is using it, or pick another:\n`);
    console.error(`      PowerShell:  $env:PORT = "3001"; node server.js`);
    console.error(`      Linux/macOS: PORT=3001 node server.js\n`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, () => {
  console.log(`\n  Tasks running at http://localhost:${PORT}`);
  console.log(`  Lessons at       http://localhost:${PORT}/learn/`);
  console.log(`  Mode:            ${IS_PRODUCTION ? 'production' : 'development'}`);
  console.log('\n  Ctrl+C to stop.\n');
});

startSessionCleanup();
startRateLimitCleanup();

/**
 * Shut down gracefully.
 *
 * `server.close()` stops accepting new connections and waits for in-flight
 * requests to finish, so nobody gets a dropped response mid-save. Closing the
 * database afterwards checkpoints the write-ahead log into the main file.
 *
 * The timeout is the backstop: if something refuses to finish, exit anyway
 * rather than hanging forever.
 */
function shutdown(signal) {
  console.log(`\n  ${signal} received, shutting down…`);

  const force = setTimeout(() => {
    console.error('  Forcing exit after 10s.');
    process.exit(1);
  }, 10_000);
  force.unref();

  server.close(() => {
    closeDatabase();
    console.log('  Closed cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
