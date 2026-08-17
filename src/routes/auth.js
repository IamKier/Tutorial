// ============================================================================
// routes/auth.js — REGISTER, LOG IN, LOG OUT
// ============================================================================

import { HttpError, sendJson, readJsonBody, buildCookie, isSecureRequest } from '../http.js';
import { hashPassword, verifyPassword, validatePassword } from '../auth/password.js';
import { createSession, destroySession, SESSION_TTL_SECONDS } from '../auth/session.js';
import { rateLimit, clearRateLimit } from '../security.js';
import { SESSION_COOKIE, TRUST_PROXY } from '../config.js';
import * as users from '../db/users.js';

/**
 * A deliberately valid-looking hash of nothing, used below to keep the timing
 * of a failed login the same whether or not the account exists.
 */
const DUMMY_HASH =
  'scrypt$16384$8$1$00000000000000000000000000000000$' + '0'.repeat(128);

function normaliseEmail(value) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

/**
 * Validate an email address.
 *
 * Deliberately loose. The full specification allows things you would not
 * believe, and every "strict" regex on the internet rejects addresses that
 * genuinely work. Check that it has one @ with something either side, cap the
 * length, and let a confirmation email be the real test.
 */
function validateEmail(email) {
  if (!email) return 'Email is required';
  if (email.length > 254) return 'Email is too long';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'That does not look like an email address';
  return null;
}

function setSessionCookie(req, res, sessionId) {
  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE, sessionId, {
      maxAge: SESSION_TTL_SECONDS,
      secure: isSecureRequest(req, TRUST_PROXY),
    })
  );
}

// ---------------------------------------------------------------------------
// POST /api/auth/register
// ---------------------------------------------------------------------------
export async function register(req, res) {
  rateLimit(req);

  const body = await readJsonBody(req);
  const email = normaliseEmail(body.email);

  const emailError = validateEmail(email);
  if (emailError) throw new HttpError(400, emailError);

  const passwordError = validatePassword(body.password);
  if (passwordError) throw new HttpError(400, passwordError);

  // Registration unavoidably reveals whether an address is already in use —
  // there is no way to be helpful about it and silent at the same time. The
  // rate limit above is what stops that being used to enumerate your users at
  // scale. (A stricter design emails the address instead of answering here.)
  if (users.emailExists(email)) {
    throw new HttpError(409, 'That email is already registered');
  }

  const passwordHash = await hashPassword(body.password);
  const user = users.createUser(email, passwordHash);

  // Log them straight in — asking someone to type the password they just chose
  // is a pointless piece of friction.
  const sessionId = createSession(user.id);
  setSessionCookie(req, res, sessionId);
  clearRateLimit(req);

  sendJson(res, 201, { user });
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
export async function login(req, res) {
  rateLimit(req);

  const body = await readJsonBody(req);
  const email = normaliseEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';

  const user = users.findByEmail(email);

  // ---- Why we hash even when the user does not exist -----------------------
  // Verifying a password takes ~100ms. Skipping it for an unknown address
  // would make that response noticeably faster, and anyone who can time our
  // replies could then discover which addresses have accounts here — without
  // ever guessing a password.
  //
  // So we always do the work, against a dummy hash that cannot match.
  const valid = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, DUMMY_HASH);

  if (!user || !valid) {
    // One message for both cases. "No account with that email" would tell an
    // attacker exactly which half they got right.
    throw new HttpError(401, 'Invalid email or password');
  }

  const sessionId = createSession(user.id);
  setSessionCookie(req, res, sessionId);
  clearRateLimit(req);

  sendJson(res, 200, { user: { id: user.id, email: user.email } });
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout
// ---------------------------------------------------------------------------
export async function logout(req, res, ctx) {
  // Delete the row, not just the cookie. Clearing the cookie alone leaves a
  // working session behind for anyone who copied the value.
  destroySession(ctx.sessionId);

  // Max-Age=0 tells the browser to discard it now.
  res.setHeader(
    'Set-Cookie',
    buildCookie(SESSION_COOKIE, '', {
      maxAge: 0,
      secure: isSecureRequest(req, TRUST_PROXY),
    })
  );

  sendJson(res, 200, { ok: true });
}

// ---------------------------------------------------------------------------
// GET /api/auth/me
//
// The page calls this on load to find out whether it should show the app or
// send you to the login screen.
// ---------------------------------------------------------------------------
export async function me(req, res, ctx) {
  if (!ctx.user) throw new HttpError(401, 'Not signed in');
  sendJson(res, 200, { user: ctx.user });
}
