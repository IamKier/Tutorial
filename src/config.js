// ============================================================================
// config.js — EVERY SETTING, IN ONE PLACE
// ============================================================================
//
// Configuration comes from environment variables, never from hard-coded values
// scattered through the code. Two reasons that matters:
//
//   1. The same code runs on your laptop and on a server, with different
//      ports, paths and secrets. Only the environment changes.
//   2. Secrets in source files end up in version control, and from there in
//      every clone and every laptop backup, permanently.
//
// Set them like this before starting the server:
//
//   PowerShell:  $env:PORT = "8080"; node server.js
//   Linux/macOS: PORT=8080 node server.js
// ============================================================================

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** The project root — one level up from src/. */
export const ROOT = path.join(__dirname, '..');

/**
 * What the server hands to browsers.
 *
 * This is the BUILD OUTPUT, not source. React's JSX cannot run in a browser,
 * so `npm run build` compiles client/ into dist/ and this serves the result.
 * Editing a file in client/ changes nothing here until you rebuild — which is
 * the main thing to get used to after adding a build step.
 */
export const PUBLIC_DIR = path.join(ROOT, 'dist');

/** Where the database file lives. Overridable so a host can put it on a disk
 *  that survives redeploys. */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, 'data');

export const DB_FILE = path.join(DATA_DIR, 'app.db');

export const PORT = Number(process.env.PORT ?? 3000);

/**
 * Hosts set NODE_ENV=production. We use it to decide how strict to be —
 * verbose errors and relaxed cookies are fine on localhost and dangerous
 * in public.
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Set this to "true" only when the app really does sit behind a reverse proxy
 * (nginx, Caddy, a platform router) that terminates HTTPS.
 *
 * When it is on, we believe the `x-forwarded-proto` and `x-forwarded-for`
 * headers. Those headers are trivially forged by whoever sends the request, so
 * believing them when there is no proxy in front lets anyone claim any IP
 * address — which would defeat the rate limiter entirely.
 */
export const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

/** How long a login lasts. */
export const SESSION_TTL_DAYS = 30;
export const SESSION_COOKIE = 'sid';

/** Limits, applied to every request. */
export const MAX_BODY_BYTES = 100_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TASKS_PER_USER = 5_000;

/** Login and registration attempts allowed per IP, per window. */
export const AUTH_RATE_LIMIT = 10;
export const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Startup checks
//
// Fail loudly at boot rather than quietly at 3am. A misconfigured server that
// starts anyway is worse than one that refuses to.
// ---------------------------------------------------------------------------
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`PORT must be a number between 1 and 65535, got "${process.env.PORT}"`);
}

if (IS_PRODUCTION && !TRUST_PROXY) {
  console.warn(
    '\n  WARNING: running in production without TRUST_PROXY=true.\n' +
      '  If a reverse proxy terminates HTTPS in front of this app, set it —\n' +
      '  otherwise session cookies will not be marked Secure.\n'
  );
}
