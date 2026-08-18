# Fullstack Library

A web-based study library for fullstack development: 23 chapters across 13
volumes, around two and a half hours of reading, with exercises at the end of
each. Browse by subject, search every word, and track what you have read.

It ships with the application those lessons dissect — a task tracker with a
**React** frontend, a hand-written **Node** backend and **SQLite** underneath.
Reading code that has to work teaches more than code written to be read.

## Run it

```bash
npm install
npm run dev          # Vite on :5173, API on :3000 — open http://localhost:5173
```

For a production-style run (React compiled, one server):

```bash
npm run serve        # build + start, open http://localhost:3000
```

| | |
| --- | --- |
| The app | <http://localhost:3000> (or `:5173` in dev) |
| The lessons | <http://localhost:3000/learn/> |

```bash
npm test             # 12 tests, no test framework needed
```

## What it does

- Add, rename (click a title), complete and delete tasks
- **Undo** on delete — no confirmation dialog, just a way back
- Due dates with an overdue state
- Filters, progress, light/dark, keyboard shortcuts (`n` to add, `Esc` to cancel)
- Re-syncs when you switch back to the tab, so two windows cannot diverge

## One thing to know before deploying

**There are no accounts.** Everyone who can reach the app shares one list and
can edit or delete anything in it. That is fine on your own machine or a private
network, and wrong on the public internet.

If you put it online, put something in front of it — a VPN, a Tailscale network,
or a reverse proxy with HTTP basic auth. Or re-add accounts: the git history has
a working implementation (scrypt hashing, server-side sessions, per-user
scoping) at the commit before this one.

## Structure

```
Tutorial/
├── server.js              wiring and startup, nothing else
├── src/                   the backend — no framework
│   ├── config.js          every setting, from the environment
│   ├── http.js            request/response helpers
│   ├── router.js          method + path → handler
│   ├── static.js          serving the build, traversal guard, SPA fallback
│   ├── security.js        CSP and other headers, rate limiting, CSRF
│   ├── db/                SQLite: connection, migrations, task queries
│   └── routes/tasks.js    the API
├── client/                the frontend — React
│   ├── index.html         the one page
│   ├── public/            copied to the site root as-is (theme.css, learn/)
│   └── src/
│       ├── main.jsx       where React starts
│       ├── App.jsx
│       ├── api.js         the only file that calls fetch
│       ├── format.js      pure formatting functions
│       ├── hooks/         useTasks, useToast, useTheme
│       └── components/
├── scripts/dev.mjs        runs Vite and the API together
├── test/                  the data layer
├── vite.config.js
├── dist/                  build output (gitignored)
└── data/app.db            SQLite (gitignored)
```

### The React side

State lives in hooks, not components. `useTasks` owns the list and every
operation on it; `TasksPage` is only about layout. That split is why the page
component reads like a description of the screen.

No router — there is one screen. Styling is plain CSS with class names, and
`theme.css` is shared with the lesson site so both halves use one palette.

### The backend side

No Express. The router, body parsing and static serving are about 150 lines and
every one of them is readable — which is the point, since the course explains
them.

## The API

| Method | Path | Does |
| --- | --- | --- |
| `GET` | `/api/tasks` | List |
| `POST` | `/api/tasks` | Create — `{"title":"…","dueAt":null}` |
| `PATCH` | `/api/tasks/:id` | Update `title`, `done` or `dueAt` |
| `DELETE` | `/api/tasks/:id` | Delete, returning the task so undo can restore it |
| `POST` | `/api/tasks/:id/undo` | Put a deleted task back |
| `DELETE` | `/api/tasks` | Clear completed |
| `GET` | `/api/health` | For an uptime monitor |

## Configuration

All settings come from the environment — see [src/config.js](src/config.js).

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `3000` | |
| `DATA_DIR` | `./data` | Put this on a disk that survives redeploys |
| `NODE_ENV` | — | Set to `production` when deployed |
| `TRUST_PROXY` | `false` | Set to `true` **only** behind a proxy that terminates HTTPS |

## Database

SQLite, via `node:sqlite` — built into Node 24, so it is not an npm dependency.

Schema changes go in the `MIGRATIONS` array in
[src/db/index.js](src/db/index.js), which tracks the applied version in the
file itself. The rule that makes it work: **never edit a migration that has
already run somewhere.** Add a new one — an edited migration will not re-run on
a database that already applied it, and the two silently drift apart.

## Still handled, even without accounts

- CSP with no `unsafe-inline`, plus `nosniff`, `frame-ancestors`, HSTS on HTTPS
- Path traversal guard on static files
- CSRF guard: a JSON content-type requirement on writes
- Rate limiting on writes, so a runaway script cannot fill the database
- Body size limits, a task ceiling, allow-listed updates
- Graceful shutdown, so no request is cut off mid-write

## The course

Fifteen lessons at `/learn/`, covering HTML, CSS, JavaScript, HTTP, Node and
data modelling, with exercises and saved progress.

> **Note:** the lessons were written against this project's earlier shape — one
> `server.js`, a `db.js`, tasks in a JSON file, and no React. Every concept
> still holds, but file paths in the lesson text point at that older layout.
> Reconciling them, and adding lessons on React and SQL, is the next job.
