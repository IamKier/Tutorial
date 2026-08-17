// ============================================================================
// test/db.test.js — THE DATA LAYER
// ============================================================================
//
// Node has a test runner built in, so this project still needs no
// dependencies. Run it with:
//
//     npm test
//
// The data layer is the right thing to test first. It is pure logic with no
// HTTP involved, the rules it enforces are the ones that matter most
// (ownership, allow-lists, limits), and a bug here corrupts data rather than
// just looking wrong.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Point the app at a throwaway database BEFORE importing anything that reads
// the config. config.js reads process.env when it is first imported, and
// db/index.js opens the file and runs migrations at import time — so this must
// happen first, and the imports below must be dynamic.
//
// A test that writes to your real database is a test you will eventually
// regret running.
// ---------------------------------------------------------------------------
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
process.env.DATA_DIR = tempDir;

const users = await import('../src/db/users.js');
const tasks = await import('../src/db/tasks.js');
const { closeDatabase } = await import('../src/db/index.js');

test.after(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/** Each test makes its own user, so no test can be affected by another. */
let counter = 0;
function makeUser() {
  counter++;
  return users.createUser(`user${counter}@test.local`, 'not-a-real-hash');
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

test('createUser returns a public user without the password hash', () => {
  const user = users.createUser('alice@test.local', 'hashed');

  assert.ok(user.id);
  assert.equal(user.email, 'alice@test.local');
  // The important assertion: a hash must never travel outward from here.
  assert.equal(user.passwordHash, undefined);
});

test('email lookup is case-insensitive', () => {
  users.createUser('bob@test.local', 'hashed');

  // The schema declares COLLATE NOCASE. Without it, Bob@Test.local would be a
  // second, separate account — and whichever one you logged into would depend
  // on how you typed it.
  assert.ok(users.findByEmail('BOB@TEST.LOCAL'));
  assert.ok(users.emailExists('Bob@Test.Local'));
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

test('a created task comes back with sane defaults', () => {
  const user = makeUser();
  const task = tasks.createTask(user.id, { title: 'Write tests' });

  assert.ok(task.id);
  assert.equal(task.title, 'Write tests');
  // `done` must be a real boolean, not the 0 that SQLite stores. If it leaked
  // through as a number, `if (task.done)` would be false for 0 — correct by
  // accident — but JSON would send `0` and the checkbox would misbehave.
  assert.equal(task.done, false);
  assert.equal(task.dueAt, null);
  assert.equal(task.createdAt, task.updatedAt);
});

test('listTasks returns newest first, and only your own', () => {
  const alice = makeUser();
  const bob = makeUser();

  tasks.createTask(alice.id, { title: 'First' });
  tasks.createTask(alice.id, { title: 'Second' });
  tasks.createTask(bob.id, { title: "Bob's task" });

  const list = tasks.listTasks(alice.id);

  assert.equal(list.length, 2);
  assert.equal(list[0].title, 'Second');
  // The whole point of scoping every query by userId.
  assert.ok(!list.some((t) => t.title === "Bob's task"));
});

test('updateTask only writes allowed fields', () => {
  const user = makeUser();
  const task = tasks.createTask(user.id, { title: 'Original' });

  const updated = tasks.updateTask(task.id, user.id, {
    title: 'Renamed',
    done: true,
    // These two must be ignored. Letting a caller set them is mass assignment,
    // and `userId` in particular would hand the task to another account.
    id: 'hijacked-id',
    userId: 'someone-else',
  });

  assert.equal(updated.title, 'Renamed');
  assert.equal(updated.done, true);
  assert.equal(updated.id, task.id);
  // Still visible to its real owner, so userId did not move.
  assert.equal(tasks.listTasks(user.id).length, 1);
});

test('updateTask refreshes updatedAt but not createdAt', async () => {
  const user = makeUser();
  const task = tasks.createTask(user.id, { title: 'Timestamps' });

  // ISO strings have millisecond resolution, so without a pause the two
  // timestamps can land in the same millisecond and the assertion below passes
  // or fails depending on how fast the machine is.
  await new Promise((resolve) => setTimeout(resolve, 5));

  const updated = tasks.updateTask(task.id, user.id, { done: true });

  assert.equal(updated.createdAt, task.createdAt);
  assert.ok(updated.updatedAt > task.updatedAt);
});

test('one user cannot read, change or delete another user\'s task', () => {
  const alice = makeUser();
  const bob = makeUser();
  const task = tasks.createTask(alice.id, { title: 'Private' });

  // Bob knows the id and still gets nothing. Ownership is enforced in the SQL,
  // not by a check a route could forget to write.
  assert.equal(tasks.getTask(task.id, bob.id), null);
  assert.equal(tasks.updateTask(task.id, bob.id, { done: true }), null);
  assert.equal(tasks.deleteTask(task.id, bob.id), false);

  // And Alice's copy is untouched.
  assert.equal(tasks.getTask(task.id, alice.id).done, false);
});

test('deleteTask reports whether anything went', () => {
  const user = makeUser();
  const task = tasks.createTask(user.id, { title: 'Delete me' });

  assert.equal(tasks.deleteTask(task.id, user.id), true);
  // Deleting twice is not an error — it is simply a no-op the second time,
  // which is what makes DELETE safe to retry.
  assert.equal(tasks.deleteTask(task.id, user.id), false);
});

test('deleteCompleted removes only finished tasks, only yours', () => {
  const alice = makeUser();
  const bob = makeUser();

  const done = tasks.createTask(alice.id, { title: 'Done' });
  tasks.createTask(alice.id, { title: 'Not done' });
  const bobsDone = tasks.createTask(bob.id, { title: "Bob's done" });

  tasks.updateTask(done.id, alice.id, { done: true });
  tasks.updateTask(bobsDone.id, bob.id, { done: true });

  assert.equal(tasks.deleteCompleted(alice.id), 1);
  assert.equal(tasks.listTasks(alice.id).length, 1);
  // Bob's completed task survives Alice clearing hers.
  assert.equal(tasks.listTasks(bob.id).length, 1);
});

test('restoreTask puts a task back with its original id and timestamps', () => {
  const user = makeUser();
  const task = tasks.createTask(user.id, { title: 'Undo me' });

  tasks.deleteTask(task.id, user.id);
  tasks.restoreTask(user.id, task);

  const restored = tasks.getTask(task.id, user.id);

  // If undo created a new id, anything referring to the old one would break —
  // and it would sort to the top instead of returning to where it was.
  assert.equal(restored.id, task.id);
  assert.equal(restored.createdAt, task.createdAt);
});

test('dueAt round-trips, and can be cleared with null', () => {
  const user = makeUser();
  const due = '2026-09-01T23:59:59.000Z';
  const task = tasks.createTask(user.id, { title: 'Due', dueAt: due });

  assert.equal(task.dueAt, due);

  const cleared = tasks.updateTask(task.id, user.id, { dueAt: null });
  // Explicit null has to be distinguishable from "field not supplied", or a
  // due date could never be removed once set.
  assert.equal(cleared.dueAt, null);
});
