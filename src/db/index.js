// ============================================================================
// db/index.js — THE DATABASE CONNECTION AND SCHEMA
// ============================================================================
//
// This replaces the JSON file the project started with. That file had four
// problems, and every one of them is fixed here:
//
//   1. It rewrote every record to change one field.
//   2. It could not search without loading everything into memory.
//   3. Two simultaneous writes lost data — a real race condition.
//   4. A crash mid-write could leave a truncated, unparseable file.
//
// SQLite is built into Node 24, so this is still a zero-dependency project. It
// is also not a toy: plenty of production services run on it happily. You only
// need a database *server* like Postgres when you need several application
// servers talking to one database.
// ============================================================================

import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { DATA_DIR, DB_FILE } from '../config.js';

// The folder has to exist before SQLite can create a file in it.
fs.mkdirSync(DATA_DIR, { recursive: true });

export const db = new DatabaseSync(DB_FILE);

// ---------------------------------------------------------------------------
// PRAGMAS — connection settings, applied before anything else
// ---------------------------------------------------------------------------

// Write-Ahead Logging. Readers no longer block the writer and the writer no
// longer blocks readers, which is what makes concurrent requests safe. This is
// the single most valuable SQLite setting for a web app.
db.exec('PRAGMA journal_mode = WAL');

// SQLite does NOT enforce foreign keys unless you ask it to — it is off by
// default for backwards compatibility. Without this line, `ON DELETE CASCADE`
// below is decorative and deleting a user would leave their tasks behind
// forever.
db.exec('PRAGMA foreign_keys = ON');

// Wait up to five seconds for a lock instead of failing instantly when another
// write is in progress.
db.exec('PRAGMA busy_timeout = 5000');

// ---------------------------------------------------------------------------
// SCHEMA
//
// Migrations, done simply. SQLite keeps an integer called `user_version` in
// the file; we use it to know which changes have already been applied.
//
// The rule that makes this work: never edit an existing migration once it has
// run somewhere. Add a new one. An edited migration will never re-run on a
// database that already applied it, so the two drift apart silently.
// ---------------------------------------------------------------------------

const MIGRATIONS = [
  // --- 1: users, sessions, tasks -------------------------------------------
  () => {
    db.exec(`
      CREATE TABLE users (
        id           TEXT PRIMARY KEY,
        -- COLLATE NOCASE makes the UNIQUE constraint case-insensitive, so
        -- nobody can register Kier@example.com when kier@example.com exists.
        email        TEXT NOT NULL UNIQUE COLLATE NOCASE,
        passwordHash TEXT NOT NULL,
        createdAt    TEXT NOT NULL
      );

      CREATE TABLE sessions (
        id        TEXT PRIMARY KEY,
        userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        createdAt TEXT NOT NULL,
        expiresAt TEXT NOT NULL
      );

      CREATE TABLE tasks (
        id        TEXT PRIMARY KEY,
        -- Every task belongs to exactly one user. This column is what keeps
        -- one person's data invisible to everyone else, and every query below
        -- filters on it.
        userId    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title     TEXT NOT NULL,
        -- SQLite has no boolean type. 0 and 1, converted at the boundary.
        done      INTEGER NOT NULL DEFAULT 0,
        dueAt     TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      -- Indexes match the queries we actually run. Without this one, listing a
      -- user's tasks means scanning every task belonging to everybody.
      CREATE INDEX idx_tasks_user ON tasks(userId, createdAt DESC);
      CREATE INDEX idx_sessions_expires ON sessions(expiresAt);
    `);
  },
];

function migrate() {
  const { user_version: current } = db.prepare('PRAGMA user_version').get();

  for (let version = current; version < MIGRATIONS.length; version++) {
    // Each migration runs inside a transaction: either all of its statements
    // land or none of them do. A migration that half-applied is the worst
    // possible state to debug.
    db.exec('BEGIN');
    try {
      MIGRATIONS[version]();
      // The version number cannot be set with a placeholder — PRAGMA does not
      // accept them. It is a loop counter we control, not user input, so
      // interpolating it here is safe.
      db.exec(`PRAGMA user_version = ${version + 1}`);
      db.exec('COMMIT');
      console.log(`  migrated database to version ${version + 1}`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

migrate();

/** Close cleanly on shutdown so WAL data is checkpointed into the main file. */
export function closeDatabase() {
  db.close();
}
