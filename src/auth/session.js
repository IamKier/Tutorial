// ============================================================================
// auth/session.js — STAYING LOGGED IN
// ============================================================================
//
// HTTP is stateless: the server forgets you the instant it answers. So every
// request after logging in has to carry proof of who you are.
//
// This uses server-side sessions:
//
//   1. On login, generate a long random token and store it in the database
//      alongside the user id.
//   2. Send the token to the browser in a cookie.
//   3. On every later request, look the token up.
//
// The cookie holds nothing but a random number. It says nothing about you, it
// cannot be modified into something useful, and logging out or a password
// change can revoke it instantly by deleting the row.
//
// The alternative — a signed JWT holding the user id — avoids the lookup but
// cannot be revoked before it expires, which is a genuinely awkward property
// when an account is compromised. Sessions first; reach for tokens when you
// have a reason.
// ============================================================================

import crypto from 'node:crypto';
import { db } from '../db/index.js';
import { SESSION_TTL_DAYS } from '../config.js';

const insertSession = db.prepare(
  `INSERT INTO sessions (id, userId, createdAt, expiresAt) VALUES (?, ?, ?, ?)`
);

const selectSession = db.prepare(
  `SELECT s.id, s.userId, s.expiresAt, u.email
     FROM sessions s
     JOIN users u ON u.id = s.userId
    WHERE s.id = ?`
);

const deleteSession = db.prepare(`DELETE FROM sessions WHERE id = ?`);
const deleteForUser = db.prepare(`DELETE FROM sessions WHERE userId = ?`);
const deleteExpired = db.prepare(`DELETE FROM sessions WHERE expiresAt < ?`);

export const SESSION_TTL_SECONDS = SESSION_TTL_DAYS * 24 * 60 * 60;

export function createSession(userId) {
  // 32 bytes = 256 bits of randomness from a cryptographically secure source.
  // Long enough that guessing one is not a strategy, and base64url so it is
  // safe in a cookie without escaping.
  //
  // Never use Math.random() for anything like this — it is predictable by
  // design, and predictable session tokens mean anyone can be anyone.
  const id = crypto.randomBytes(32).toString('base64url');

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_SECONDS * 1000);

  insertSession.run(id, userId, now.toISOString(), expiresAt.toISOString());
  return id;
}

/**
 * Look up a session. Returns { userId, email } or null.
 *
 * Expiry is checked here rather than trusted to the cleanup job below, because
 * cleanup runs on a timer and a session must stop working the moment it is
 * due to — not the next time we happen to sweep.
 */
export function getSession(sessionId) {
  if (!sessionId) return null;

  const row = selectSession.get(sessionId);
  if (!row) return null;

  if (new Date(row.expiresAt) < new Date()) {
    deleteSession.run(sessionId);
    return null;
  }

  return { userId: row.userId, email: row.email };
}

export function destroySession(sessionId) {
  if (sessionId) deleteSession.run(sessionId);
}

/** Log a user out everywhere. Call this after a password change. */
export function destroyAllForUser(userId) {
  deleteForUser.run(userId);
}

/**
 * Remove expired rows so the table does not grow forever.
 *
 * `unref()` tells Node this timer should not keep the process alive — without
 * it, the server would refuse to exit on Ctrl+C until the next tick fired.
 */
export function startSessionCleanup() {
  const sweep = () => deleteExpired.run(new Date().toISOString());

  sweep();
  const timer = setInterval(sweep, 60 * 60 * 1000);
  timer.unref();
  return timer;
}
