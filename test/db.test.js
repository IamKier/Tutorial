// ============================================================================
// test/db.test.js — THE DATA LAYER
// ============================================================================
//
// Node has a test runner built in, so this needs no test framework:
//
//     npm test
//
// The data layer is the right thing to test. It is pure logic with no HTTP
// involved, the rules it enforces are the ones that matter most (allow-lists,
// limits, type conversion), and a bug here corrupts data rather than just
// looking wrong.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// ---------------------------------------------------------------------------
// Point the app at a throwaway database BEFORE importing anything that reads
// the config. config.js reads process.env when it is first imported, and
// db/index.js opens the file and runs migrations at import time — so this has
// to happen first, and the imports below have to be dynamic.
//
// A test that writes to your real database is a test you will regret running.
// ---------------------------------------------------------------------------
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tasks-test-'));
process.env.DATA_DIR = tempDir;

const db = await import('../src/db/tasks.js');
const { closeDatabase } = await import('../src/db/index.js');

test.after(() => {
  closeDatabase();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

/** Start each test from an empty table, so no test can affect another. */
function reset() {
  for (const task of db.listTasks()) db.deleteTask(task.id);
}

// ---------------------------------------------------------------------------

test('a created task comes back with sane defaults', () => {
  reset();
  const task = db.createTask({ title: 'Write tests' });

  assert.ok(task.id);
  assert.equal(task.title, 'Write tests');
  // A real boolean, not the 0 SQLite stores. If the number leaked through,
  // JSON would send `0` to a checkbox that expects `false`.
  assert.equal(task.done, false);
  assert.equal(task.dueAt, null);
  assert.equal(task.createdAt, task.updatedAt);
});

test('ids are unique across tasks with the same title', () => {
  reset();
  const a = db.createTask({ title: 'Same' });
  const b = db.createTask({ title: 'Same' });

  assert.notEqual(a.id, b.id);
});

test('listTasks returns newest first', () => {
  reset();
  db.createTask({ title: 'First' });
  db.createTask({ title: 'Second' });
  db.createTask({ title: 'Third' });

  const list = db.listTasks();

  assert.equal(list.length, 3);
  assert.equal(list[0].title, 'Third');
  assert.equal(list[2].title, 'First');
});

test('updateTask only writes allowed fields', () => {
  reset();
  const task = db.createTask({ title: 'Original' });

  const updated = db.updateTask(task.id, {
    title: 'Renamed',
    done: true,
    // Must be ignored. Letting a caller set the id is mass assignment, and it
    // would let one request overwrite an unrelated row.
    id: 'hijacked-id',
    createdAt: '1999-01-01T00:00:00.000Z',
  });

  assert.equal(updated.title, 'Renamed');
  assert.equal(updated.done, true);
  assert.equal(updated.id, task.id);
  assert.equal(updated.createdAt, task.createdAt);
});

test('updateTask refreshes updatedAt but not createdAt', async () => {
  reset();
  const task = db.createTask({ title: 'Timestamps' });

  // ISO strings have millisecond resolution, so without a pause both
  // timestamps can land in the same millisecond and this passes or fails
  // depending on how fast the machine is.
  await new Promise((resolve) => setTimeout(resolve, 5));

  const updated = db.updateTask(task.id, { done: true });

  assert.equal(updated.createdAt, task.createdAt);
  assert.ok(updated.updatedAt > task.updatedAt);
});

test('updating an unknown id returns null rather than throwing', () => {
  reset();
  assert.equal(db.updateTask('no-such-id', { done: true }), null);
  assert.equal(db.getTask('no-such-id'), null);
});

test('an update with no recognised fields changes nothing', () => {
  reset();
  const task = db.createTask({ title: 'Untouched' });

  const result = db.updateTask(task.id, { nonsense: true });

  assert.deepEqual(result, task);
});

test('deleteTask reports whether anything went', () => {
  reset();
  const task = db.createTask({ title: 'Delete me' });

  assert.equal(db.deleteTask(task.id), true);
  // Deleting twice is not an error — it is a no-op the second time, which is
  // what makes DELETE safe to retry.
  assert.equal(db.deleteTask(task.id), false);
});

test('deleteCompleted removes only finished tasks', () => {
  reset();
  const done = db.createTask({ title: 'Done' });
  db.createTask({ title: 'Not done' });
  db.updateTask(done.id, { done: true });

  assert.equal(db.deleteCompleted(), 1);

  const left = db.listTasks();
  assert.equal(left.length, 1);
  assert.equal(left[0].title, 'Not done');
});

test('restoreTask puts a task back with its original id and timestamps', () => {
  reset();
  const task = db.createTask({ title: 'Undo me' });

  db.deleteTask(task.id);
  db.restoreTask(task);

  const restored = db.getTask(task.id);

  // A new id would break anything referring to the old one, and the task would
  // sort to the top instead of returning to where it was.
  assert.equal(restored.id, task.id);
  assert.equal(restored.createdAt, task.createdAt);
  assert.deepEqual(restored, task);
});

test('dueAt round-trips, and can be cleared with null', () => {
  reset();
  const due = '2026-09-01T23:59:59.000Z';
  const task = db.createTask({ title: 'Due', dueAt: due });

  assert.equal(task.dueAt, due);

  const cleared = db.updateTask(task.id, { dueAt: null });
  // Explicit null has to be distinguishable from "field not supplied", or a
  // due date could never be removed once set.
  assert.equal(cleared.dueAt, null);
});

test('a done task survives a title change', () => {
  reset();
  const task = db.createTask({ title: 'Before' });
  db.updateTask(task.id, { done: true });

  const renamed = db.updateTask(task.id, { title: 'After' });

  // Each field is written independently, so touching one must not reset
  // another. Easy to get wrong with a naive "replace the whole row" update.
  assert.equal(renamed.title, 'After');
  assert.equal(renamed.done, true);
});
