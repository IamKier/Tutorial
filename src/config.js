// ============================================================================
// config.js — EVERY SETTING, IN ONE PLACE
// ============================================================================
//
// Configuration comes from environment variables, never from values scattered
// through the code. The same code then runs on your laptop and on a server
// with only the environment differing.
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
 * Editing a file in client/ changes nothing here until you rebuild — the main
 * thing to get used to after adding a build step.
 */
export const PUBLIC_DIR = path.join(ROOT, 'dist');

/** Overridable so a host can put the database on a disk that survives deploys. */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(ROOT, 'data');
export const DB_FILE = path.join(DATA_DIR, 'app.db');

export const PORT = Number(process.env.PORT ?? 3000);

/**
 * Hosts set NODE_ENV=production. We use it to decide how strict to be —
 * verbose errors and uncached assets are fine locally and wrong in public.
 */
export const IS_PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Set this to "true" only when the app really does sit behind a reverse proxy
 * that terminates HTTPS.
 *
 * When it is on, we believe the `x-forwarded-proto` and `x-forwarded-for`
 * headers. Those are trivially forged by whoever sends the request, so
 * believing them with no proxy in front would let anyone claim any IP address
 * and walk straight past the rate limiter.
 */
export const TRUST_PROXY = process.env.TRUST_PROXY === 'true';

/** Limits, applied to every request. */
export const MAX_BODY_BYTES = 100_000;
export const MAX_TITLE_LENGTH = 200;
export const MAX_TASKS = 5_000;

/** Write requests allowed per IP, per minute. */
export const WRITE_RATE_LIMIT = 120;
export const WRITE_RATE_WINDOW_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// Startup checks
//
// Fail loudly at boot rather than quietly at 3am. A misconfigured server that
// starts anyway is worse than one that refuses to.
// ---------------------------------------------------------------------------
if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error(`PORT must be a number between 1 and 65535, got "${process.env.PORT}"`);
}

if (IS_PRODUCTION) {
  console.warn(
    '\n  NOTE: this app has no accounts. Everyone who can reach it shares one\n' +
      '  task list and can edit or delete anything in it. Put it behind a\n' +
      '  private network, or a proxy that requires a password, before exposing\n' +
      '  it to the internet.\n'
  );
}
