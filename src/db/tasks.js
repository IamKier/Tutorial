// ============================================================================
// db/tasks.js — TASK QUERIES
// ============================================================================
//
// Every SQL statement in the app lives here. Nothing outside this file writes
// SQL, which means there is exactly one place to look when you need to know
// how tasks are stored — and one file to rewrite if you ever move to Postgres.
// ============================================================================

import crypto from 'node:crypto';
import { db } from './index.js';
import { MAX_TASKS } from '../config.js';

// ---------------------------------------------------------------------------
// Statements are prepared ONCE, at module load, and reused for every call.
//
// Preparing parses and plans the query. Doing it per request throws that work
// away every time — the cheapest performance win in any SQL codebase.
//
// Note the `?` placeholders. Values are passed separately at call time and the
// database never treats them as SQL, which is what makes injection impossible.
// Building these strings with template literals is how data breaches happen.
// ---------------------------------------------------------------------------
// Ordered newest first — with a tie-break, which is not optional.
//
// createdAt has millisecond resolution, so two tasks created in the same
// millisecond compare equal and SQLite is then free to return them in any
// order it likes. That is rare by hand and routine in a loop or a test, and it
// shows up as a list that reshuffles itself between reloads.
//
// rowid is SQLite's own always-increasing integer key, so it breaks the tie in
// true insertion order.
const selectAll = db.prepare(`SELECT * FROM tasks ORDER BY createdAt DESC, rowid DESC`);
const selectOne = db.prepare(`SELECT * FROM tasks WHERE id = ?`);

const insertTask = db.prepare(
  `INSERT INTO tasks (id, title, done, dueAt, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?)`
);

const deleteOne = db.prepare(`DELETE FROM tasks WHERE id = ?`);
const deleteDone = db.prepare(`DELETE FROM tasks WHERE done = 1`);
const countAll = db.prepare(`SELECT COUNT(*) AS n FROM tasks`);

/**
 * SQLite has no boolean type, so `done` comes back as 0 or 1. Convert at the
 * boundary — the rest of the application should never see a number pretending
 * to be a boolean, or `JSON.stringify` would send `0` to a checkbox that
 * expects `false`.
 */
function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    done: row.done === 1,
    dueAt: row.dueAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listTasks() {
  return selectAll.all().map(toTask);
}

export function getTask(id) {
  return toTask(selectOne.get(id));
}

export function countTasks() {
  return countAll.get().n;
}

export function createTask({ title, dueAt = null }) {
  // A ceiling on the table. Without one, a runaway script can fill the disk,
  // and a full disk takes the whole machine down rather than just this app.
  if (countTasks() >= MAX_TASKS) {
    throw new Error('Task limit reached');
  }

  const now = new Date().toISOString();
  const task = {
    // A random id rather than a counter. Two requests arriving together can
    // both read "the highest is 4" and both decide to be 5; random ids cannot
    // collide, and they do not leak how many records exist.
    id: crypto.randomUUID(),
    title,
    done: false,
    dueAt,
    createdAt: now,
    updatedAt: now,
  };

  insertTask.run(task.id, task.title, 0, task.dueAt, task.createdAt, task.updatedAt);
  return task;
}

/**
 * Update a task. Returns the updated task, or null if there is no such id.
 *
 * `changes` may contain title, done and dueAt. Anything else is ignored.
 */
export function updateTask(id, changes) {
  const existing = getTask(id);
  if (!existing) return null;

  // An allow-list, built column by column. The alternative — interpolating
  // whatever keys arrived in the request into the SQL — would let a caller
  // write to any column, including the id. That is mass assignment, and the
  // guard costs three lines.
  const fields = [];
  const values = [];

  if (typeof changes.title === 'string') {
    fields.push('title = ?');
    values.push(changes.title);
  }

  if (typeof changes.done === 'boolean') {
    fields.push('done = ?');
    values.push(changes.done ? 1 : 0);
  }

  // Explicitly allow null, which is how a due date is cleared. Without this,
  // a date once set could never be removed.
  if (changes.dueAt === null || typeof changes.dueAt === 'string') {
    fields.push('dueAt = ?');
    values.push(changes.dueAt);
  }

  if (fields.length === 0) return existing;

  fields.push('updatedAt = ?');
  values.push(new Date().toISOString());

  // The column NAMES here come from our own list above, never from the
  // request. Only the values are user input, and those are still placeholders.
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values, id);

  return getTask(id);
}

/** Returns true if a row was actually removed. */
export function deleteTask(id) {
  return deleteOne.run(id).changes > 0;
}

/** Delete every completed task. Returns how many went. */
export function deleteCompleted() {
  return deleteDone.run().changes;
}

/**
 * Put a task back after an undo.
 *
 * Undo needs the ORIGINAL id and timestamps. Without them, "undo" quietly
 * creates a different task that merely looks the same — it would sort to the
 * top instead of returning to where it was, and anything referring to the old
 * id would be broken.
 */
export function restoreTask(task) {
  insertTask.run(
    task.id,
    task.title,
    task.done ? 1 : 0,
    task.dueAt ?? null,
    task.createdAt,
    task.updatedAt
  );
  return task;
}
