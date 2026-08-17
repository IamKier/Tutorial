// ============================================================================
// auth/password.js — HASHING PASSWORDS
// ============================================================================
//
// Rules, in order of importance:
//
//   1. Never store a password. Store a hash of it.
//   2. Never use a fast hash. SHA-256 is designed to be quick, which means an
//      attacker with your database can try billions of guesses a second.
//      Password hashes are deliberately SLOW.
//   3. Never use one salt for everything. A random salt per password means
//      two people with the same password get different hashes, so cracking one
//      tells the attacker nothing about the other.
//   4. Never compare hashes with ===. See the note on timing below.
//
// scrypt is built into Node and is a sound choice. Argon2id is the current
// favourite but needs a package; bcrypt is fine too. Anything on that list
// beats what you would design yourself.
// ============================================================================

import crypto from 'node:crypto';
import { promisify } from 'node:util';

// The callback version blocks nothing; the sync version would freeze the whole
// server for ~100ms per login, which is an easy way to take yourself down.
const scrypt = promisify(crypto.scrypt);

// Cost parameters. N is the work factor — doubling it doubles the time and
// memory needed, for you and for an attacker equally. These are Node's
// defaults and land around 100ms on ordinary hardware, which is the right
// order of magnitude: slow enough to ruin brute force, fast enough that
// logging in feels instant.
const N = 16384;
const r = 8;
const p = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

// scrypt refuses to allocate more than maxmem. 128 * N * r is what it needs;
// the doubling is headroom.
const MAX_MEM = 128 * N * r * 2;

/**
 * Hash a password for storage.
 *
 * The returned string contains the algorithm, its parameters, the salt and the
 * hash, separated by $. Storing the parameters alongside the hash is what lets
 * you raise the cost later without invalidating everyone's existing password —
 * old hashes still verify with the old settings.
 */
export async function hashPassword(password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, { N, r, p, maxmem: MAX_MEM });

  return ['scrypt', N, r, p, salt.toString('hex'), derived.toString('hex')].join('$');
}

/**
 * Check a password against a stored hash.
 *
 * Returns false rather than throwing on a malformed stored value — a corrupted
 * row should fail the login, not crash the server.
 */
export async function verifyPassword(password, stored) {
  try {
    const [scheme, nStr, rStr, pStr, saltHex, hashHex] = stored.split('$');
    if (scheme !== 'scrypt') return false;

    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');

    // Use the parameters this hash was CREATED with, not today's constants.
    const derived = await scrypt(password, salt, expected.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
      maxmem: 128 * Number(nStr) * Number(rStr) * 2,
    });

    // ---- Why not derived.equals(expected) -----------------------------------
    // A normal comparison stops at the first byte that differs. That makes it
    // very slightly faster for a wrong guess than a nearly-right one, and an
    // attacker who can measure that difference can recover the hash one byte
    // at a time.
    //
    // timingSafeEqual always compares every byte. It also throws if the two
    // buffers are different lengths, which is why the length check comes
    // first.
    if (derived.length !== expected.length) return false;
    return crypto.timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

/**
 * Is this password acceptable?
 *
 * Length is what actually matters. The old advice — a symbol, a digit, a
 * capital — produces `Password1!` and nothing more secure, so modern guidance
 * (NIST included) is to require length, allow everything, and check nothing
 * else. The upper bound exists because scrypt hashes whatever you give it, and
 * a 10MB password is a free way to burn your CPU.
 */
export function validatePassword(password) {
  if (typeof password !== 'string') return 'Password is required';
  if (password.length < 10) return 'Password must be at least 10 characters';
  if (password.length > 200) return 'Password must be 200 characters or fewer';
  return null;
}
