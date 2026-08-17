// ============================================================================
// test/password.test.js — HASHING
// ============================================================================
//
// Security code is the code you least want to be wrong and the code whose
// bugs are hardest to notice — a broken hash still lets people log in, right
// up until it lets the wrong people log in.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';

import { hashPassword, verifyPassword, validatePassword } from '../src/auth/password.js';

test('a correct password verifies', async () => {
  const stored = await hashPassword('correct-horse-battery-staple');
  assert.equal(await verifyPassword('correct-horse-battery-staple', stored), true);
});

test('a wrong password does not', async () => {
  const stored = await hashPassword('correct-horse-battery-staple');

  assert.equal(await verifyPassword('wrong', stored), false);
  // One character out, and off by case — both must fail.
  assert.equal(await verifyPassword('correct-horse-battery-stapl', stored), false);
  assert.equal(await verifyPassword('Correct-Horse-Battery-Staple', stored), false);
});

test('the same password hashes differently every time', async () => {
  const a = await hashPassword('same-password-twice');
  const b = await hashPassword('same-password-twice');

  // Different random salts. If these matched, an attacker could tell which
  // users share a password, and one cracked hash would expose all of them.
  assert.notEqual(a, b);

  // Both still verify, because the salt travels with the hash.
  assert.equal(await verifyPassword('same-password-twice', a), true);
  assert.equal(await verifyPassword('same-password-twice', b), true);
});

test('the stored format carries its own parameters', async () => {
  const stored = await hashPassword('a-password-for-testing');
  const [scheme, N, r, p, salt, hash] = stored.split('$');

  assert.equal(scheme, 'scrypt');
  assert.ok(Number(N) >= 16384, 'work factor should not be weakened');
  assert.ok(Number(r) > 0);
  assert.ok(Number(p) > 0);
  assert.equal(salt.length, 32, '16 random bytes as hex');
  assert.ok(hash.length > 0);

  // Storing the parameters is what lets you raise the cost later without
  // invalidating every existing password — old hashes verify with old
  // settings.
});

test('a malformed stored hash fails rather than throwing', async () => {
  // A corrupted row should fail the login, not take the server down. Each of
  // these is a different way the value could be wrong.
  for (const bad of ['', 'nonsense', 'scrypt$only$four$parts', 'bcrypt$1$2$3$4$5', '$$$$$']) {
    assert.equal(await verifyPassword('anything', bad), false);
  }
});

test('validatePassword enforces length and nothing else', () => {
  assert.ok(validatePassword('short'), 'nine characters or fewer is rejected');
  assert.equal(validatePassword('exactly-10'), null, 'ten characters is accepted');
  assert.ok(validatePassword('x'.repeat(201)), 'absurdly long is rejected');
  assert.ok(validatePassword(12345), 'a non-string is rejected');

  // No rule about symbols or digits, deliberately. That advice produces
  // "Password1!" and nothing more secure — modern guidance is to require
  // length, allow everything, and check nothing else.
  assert.equal(validatePassword('all lowercase words no digits'), null);
});
