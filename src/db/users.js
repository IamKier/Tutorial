// ============================================================================
// db/users.js — USER QUERIES
// ============================================================================
//
// Every SQL statement about users lives here. Nothing outside this file writes
// SQL, which means there is exactly one place to look when you need to know
// how users are stored.
// ============================================================================

import crypto from 'node:crypto';
import { db } from './index.js';

// ---------------------------------------------------------------------------
// Statements are prepared ONCE, at module load, and reused for every call.
//
// Preparing parses and plans the query. Doing it per request throws that work
// away every time — this is the cheapest performance win in any SQL codebase.
//
// Note the `?` placeholders. Values are passed separately at call time and the
// database never treats them as SQL, which is what makes injection impossible.
// Building these strings with template literals is how data breaches happen.
// ---------------------------------------------------------------------------
const insertUser = db.prepare(
  `INSERT INTO users (id, email, passwordHash, createdAt) VALUES (?, ?, ?, ?)`
);

const selectByEmail = db.prepare(`SELECT * FROM users WHERE email = ?`);
const selectById = db.prepare(`SELECT * FROM users WHERE id = ?`);

/** Strip the password hash before a user object goes anywhere near a response. */
function publicUser(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, createdAt: row.createdAt };
}

export function findByEmail(email) {
  return selectByEmail.get(email) ?? null;
}

export function findById(id) {
  return publicUser(selectById.get(id));
}

/**
 * Create a user. The caller hashes the password — this file does not know or
 * care how, and that separation is deliberate.
 *
 * Returns the public user object.
 */
export function createUser(email, passwordHash) {
  const user = {
    id: crypto.randomUUID(),
    email,
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  insertUser.run(user.id, user.email, user.passwordHash, user.createdAt);
  return publicUser(user);
}

/**
 * Does this email already exist?
 *
 * Worth knowing: we do NOT use this to give a friendly "that email is taken"
 * message on the registration form. Doing so tells anyone who asks which email
 * addresses have accounts here — an account enumeration leak. The UNIQUE
 * constraint in the schema is the real guard; this is for internal checks.
 */
export function emailExists(email) {
  return selectByEmail.get(email) !== undefined;
}
