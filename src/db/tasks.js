// ============================================================================
// db/tasks.js — TASK QUERIES
// ============================================================================
//
// Same four operations the JSON version had — list, create, update, delete —
// with one change that runs through every single one of them:
//
//     EVERY QUERY IS SCOPED BY userId.
//
// Not "we check ownership in the route". The ownership check is part of the
// query itself, so a route that forgets to check cannot leak another person's
// data — the row simply is not returned. Make the safe thing the only thing
// available and you cannot forget it under pressure.
// ============================================================================

import crypto from 'node:crypto';
import { db } from './index.js';
import { MAX_TASKS_PER_USER } from '../config.js';

const selectAll = db.prepare(
  `SELECT * FROM tasks WHERE userId = ? ORDER BY createdAt DESC`
);

// Note the `AND userId = ?` on every single-row statement. Knowing a task's id
// is not enough to touch it — you must also own it.
const selectOne = db.prepare(`SELECT * FROM tasks WHERE id = ? AND userId = ?`);

const insertTask = db.prepare(
  `INSERT INTO tasks (id, userId, title, done, dueAt, createdAt, updatedAt)
   VALUES (?, ?, ?, ?, ?, ?, ?)`
);

const deleteOne = db.prepare(`DELETE FROM tasks WHERE id = ? AND userId = ?`);
const deleteDone = db.prepare(`DELETE FROM tasks WHERE userId = ? AND done = 1`);
const countForUser = db.prepare(`SELECT COUNT(*) AS n FROM tasks WHERE userId = ?`);

/**
 * SQLite has no boolean type, so `done` comes back as 0 or 1. Convert at the
 * boundary — the rest of the application should never see a number pretending
 * to be a boolean, because `if (task.done)` would then be true for a task that
 * is not done.
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

export function listTasks(userId) {
  return selectAll.all(userId).map(toTask);
}

export function getTask(id, userId) {
  return toTask(selectOne.get(id, userId));
}

export function countTasks(userId) {
  return countForUser.get(userId).n;
}

export function createTask(userId, { title, dueAt = null }) {
  // A per-user ceiling. Without one, a single account can fill the disk —
  // which takes the service down for everybody, not just them.
  if (countTasks(userId) >= MAX_TASKS_PER_USER) {
    throw new Error('Task limit reached');
  }

  const now = new Date().toISOString();
  const task = {
    id: crypto.randomUUID(),
    title,
    done: false,
    dueAt,
    createdAt: now,
    updatedAt: now,
  };

  insertTask.run(task.id, userId, task.title, 0, task.dueAt, task.createdAt, task.updatedAt);
  return task;
}

/**
 * Update a task. Returns the updated task, or null if it does not exist or is
 * not yours — the caller cannot tell those apart, and should not be able to.
 *
 * `changes` may contain title, done and dueAt. Anything else is ignored.
 */
export function updateTask(id, userId, changes) {
  const existing = getTask(id, userId);
  if (!existing) return null;

  // An allow-list, built column by column. The alternative — interpolating
  // whatever keys arrived in the request into the SQL — would let a caller
  // write to any column, including userId. That is mass assignment, and it is
  // how one account ends up owning another account's data.
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

  // Explicitly allow null, which is how a due date is cleared.
  if (changes.dueAt === null || typeof changes.dueAt === 'string') {
    fields.push('dueAt = ?');
    values.push(changes.dueAt);
  }

  if (fields.length === 0) return existing;

  fields.push('updatedAt = ?');
  values.push(new Date().toISOString());

  // The column NAMES here come from our own list above, never from the
  // request. Only the values are user input, and those are still placeholders.
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND userId = ?`).run(
    ...values,
    id,
    userId
  );

  return getTask(id, userId);
}

/** Returns true if a row was actually removed. */
export function deleteTask(id, userId) {
  return deleteOne.run(id, userId).changes > 0;
}

/** Delete every completed task. Returns how many went. */
export function deleteCompleted(userId) {
  return deleteDone.run(userId).changes;
}

/**
 * Put a task back after an undo.
 *
 * Undo needs the ORIGINAL id and timestamps, otherwise "undo" quietly creates
 * a different task that merely looks the same — and anything that referred to
 * the old id is now broken.
 */
export function restoreTask(userId, task) {
  insertTask.run(
    task.id,
    userId,
    task.title,
    task.done ? 1 : 0,
    task.dueAt ?? null,
    task.createdAt,
    task.updatedAt
  );
  return task;
}
