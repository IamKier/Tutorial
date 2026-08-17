// ============================================================================
// routes/tasks.js — THE TASK API
// ============================================================================
//
//   GET    /api/tasks           list yours
//   POST   /api/tasks           create one
//   PATCH  /api/tasks/:id       update one
//   DELETE /api/tasks/:id       delete one
//   POST   /api/tasks/:id/undo  put a deleted one back
//   DELETE /api/tasks           clear completed
//
// Every handler receives ctx.user, guaranteed non-null by requireAuth in
// server.js, and passes ctx.user.id to the database layer — which scopes every
// query by it. Ownership is enforced in the SQL, not remembered here.
// ============================================================================

import { HttpError, sendJson, readJsonBody } from '../http.js';
import { MAX_TITLE_LENGTH } from '../config.js';
import * as db from '../db/tasks.js';

/**
 * Validate a title. Returns the cleaned value or throws.
 *
 * The browser form checks this too, but a form is not the only way to reach
 * this endpoint — anyone can send a request directly. Client-side validation
 * is a courtesy to honest users; this is the check that protects the data.
 */
function cleanTitle(value) {
  if (typeof value !== 'string') throw new HttpError(400, 'A "title" string is required');

  const title = value.trim();
  if (!title) throw new HttpError(400, 'Title cannot be empty');
  if (title.length > MAX_TITLE_LENGTH) {
    throw new HttpError(400, `Title must be ${MAX_TITLE_LENGTH} characters or fewer`);
  }

  return title;
}

/**
 * Validate a due date. Accepts an ISO string or null (which clears it).
 *
 * `new Date('nonsense')` does not throw — it produces an Invalid Date, and
 * arithmetic on that silently gives NaN. Checking with isNaN is the only
 * reliable way to catch it.
 */
function cleanDueAt(value) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new HttpError(400, '"dueAt" must be a date string or null');

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, '"dueAt" is not a valid date');

  // Store it normalised, so everything in the database is the same shape
  // regardless of what the client sent.
  return date.toISOString();
}

// ---------------------------------------------------------------------------

export async function list(req, res, ctx) {
  sendJson(res, 200, db.listTasks(ctx.user.id));
}

export async function create(req, res, ctx) {
  const body = await readJsonBody(req);

  const title = cleanTitle(body.title);
  const dueAt = cleanDueAt(body.dueAt);

  let task;
  try {
    task = db.createTask(ctx.user.id, { title, dueAt });
  } catch (err) {
    if (err.message === 'Task limit reached') {
      throw new HttpError(409, 'You have reached the maximum number of tasks');
    }
    throw err;
  }

  // 201 Created, not 200. The precise code tells another developer what
  // happened without them having to ask.
  sendJson(res, 201, task);
}

export async function update(req, res, ctx) {
  const body = await readJsonBody(req);

  // Build the changes explicitly rather than forwarding the request body. The
  // database layer allow-lists as well — two layers, because this is the
  // mistake that lets one account write into another's rows.
  const changes = {};
  if (body.title !== undefined) changes.title = cleanTitle(body.title);
  if (body.done !== undefined) {
    if (typeof body.done !== 'boolean') throw new HttpError(400, '"done" must be true or false');
    changes.done = body.done;
  }
  if (body.dueAt !== undefined) changes.dueAt = cleanDueAt(body.dueAt);

  const task = db.updateTask(ctx.params.id, ctx.user.id, changes);

  // Null means "no such task, or not yours". The caller cannot tell those
  // apart, and should not be able to — otherwise a 403 versus a 404 reveals
  // which ids exist.
  if (!task) throw new HttpError(404, 'Task not found');

  sendJson(res, 200, task);
}

export async function remove(req, res, ctx) {
  // Read it before deleting so the response can carry the whole task back.
  // That is what makes undo possible without a server-side trash table: the
  // client holds the only copy until the toast disappears.
  const task = db.getTask(ctx.params.id, ctx.user.id);
  if (!task) throw new HttpError(404, 'Task not found');

  db.deleteTask(ctx.params.id, ctx.user.id);

  sendJson(res, 200, { deleted: task });
}

export async function undo(req, res, ctx) {
  const body = await readJsonBody(req);
  const task = body.task;

  if (!task || typeof task !== 'object' || task.id !== ctx.params.id) {
    throw new HttpError(400, 'A matching "task" object is required');
  }

  // Everything here is re-validated. The client is handing back an object we
  // gave it a moment ago, but "we sent it" is not a reason to trust what comes
  // back — it may have been edited in between.
  const restored = {
    id: ctx.params.id,
    title: cleanTitle(task.title),
    done: typeof task.done === 'boolean' ? task.done : false,
    dueAt: cleanDueAt(task.dueAt),
    createdAt: cleanDueAt(task.createdAt) ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (db.getTask(restored.id, ctx.user.id)) {
    throw new HttpError(409, 'That task already exists');
  }

  db.restoreTask(ctx.user.id, restored);
  sendJson(res, 201, restored);
}

export async function clearCompleted(req, res, ctx) {
  const count = db.deleteCompleted(ctx.user.id);
  sendJson(res, 200, { deleted: count });
}
