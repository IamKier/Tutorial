# Tasks

A fullstack task app: **React** on the front, a hand-written **Node** backend
on the back, **SQLite** underneath. Accounts, sessions, and the security work a
public deployment needs.

It also ships a 15-lesson course that teaches the web by explaining the code
next to it.

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
npm test             # 17 tests, no test framework needed
```

## What it does

- Accounts with email and password; sessions survive a restart
- Add, rename (click a title), complete and delete tasks
- **Undo** on delete — no confirmation dialog, just a way back
- Due dates with an overdue state
- Filters, progress, light/dark, keyboard shortcuts (`n` to add, `Esc` to cancel)
- Re-syncs when you switch back to the tab, so two windows cannot diverge

## Structure

```
Tutorial/
├── server.js              wiring and startup, nothing else
├── src/                   the backend — no framework
│   ├── config.js          every setting, from the environment
│   ├── http.js            request/response helpers, cookies
│   ├── router.js          method + path → handler
│   ├── static.js          serving the build, traversal guard, SPA fallback
│   ├── security.js        CSP and other headers, rate limiting, CSRF
│   ├── db/                SQLite: connection, migrations, users, tasks
│   ├── auth/              scrypt hashing, server-side sessions
│   └── routes/            the API handlers
├── client/                the frontend — React
│   ├── index.html         the one page
│   ├── public/            copied to the site root as-is (theme.css, learn/)
│   └── src/
│       ├── main.jsx       where React starts
│       ├── App.jsx        signed in? tasks : login
│       ├── api.js         the only file that calls fetch
│       ├── format.js      pure formatting functions
│       ├── hooks/         useAuth, useTasks, useToast, useTheme
│       └── components/
├── scripts/dev.mjs        runs Vite and the API together
├── test/                  the data layer and the hashing
├── vite.config.js
├── dist/                  build output (gitignored)
└── data/app.db            SQLite (gitignored — it holds real accounts)
```

### The React side

State lives in hooks, not in components. `useTasks` owns the list and every
operation on it; `TasksPage` is only about layout. That split is why the page
component reads like a description of the screen.

There is **no router** — the app has two screens and which one you see depends
on whether you are signed in, which is a condition rather than a URL. Add one
when you have routes worth bookmarking.

Styling is plain CSS with class names. React changes how markup is produced, not
how it is styled, and `theme.css` is shared with the lesson site so both halves
use one palette.

### The backend side

No Express. The router, body parsing and static serving are about 150 lines,
and every one of them is readable — which is the point, since the course
explains them.

## The API

Everything under `/api/tasks` requires a session cookie and is scoped to that
user. Ownership is enforced in the SQL, so a handler that forgot to check
still could not leak another account's data.

| Method | Path | Does |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Create an account and sign in |
| `POST` | `/api/auth/login` | Sign in |
| `POST` | `/api/auth/logout` | Destroy the session |
| `GET` | `/api/auth/me` | Who am I? |
| `GET` | `/api/tasks` | List yours |
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

## Deploying

Build first, then run. The app speaks plain HTTP — put a reverse proxy in front
to terminate HTTPS. Caddy does it in two lines and gets certificates itself:

```
tasks.example.com {
    reverse_proxy localhost:3000
}
```

Run with `NODE_ENV=production` and `TRUST_PROXY=true` so session cookies get the
`Secure` flag and rate limiting sees real client IPs.

### Already handled

- Passwords hashed with scrypt, random salt each, timing-safe comparison
- Sessions as opaque random tokens in the database, revocable instantly
- Cookies `HttpOnly`, `SameSite=Lax`, `Secure` over HTTPS
- CSRF: `SameSite` plus a JSON-content-type requirement on writes
- Rate limiting on login and registration
- CSP with no `unsafe-inline`, plus `nosniff`, `frame-ancestors`, HSTS on HTTPS
- Path traversal guard on static files
- Body size limits, per-user task limits, allow-listed updates
- Login reveals nothing about which emails have accounts
- Graceful shutdown, so no request is cut off mid-write

### Not yet

No email verification, password reset, two-factor, backups, structured logging
or pagination. Each is a real next step.

SQLite means one server. Scaling to several means moving to Postgres — a
rewrite of `src/db/` and nothing else.

## The course

Fifteen lessons at `/learn/`, covering HTML, CSS, JavaScript, HTTP, Node and
data modelling, with exercises and saved progress.

> **Note:** the lessons were written against this project's earlier shape — one
> `server.js`, a `db.js`, tasks in a JSON file, and no React. Every concept
> still holds, but file paths in the lesson text point at that older layout.
> Reconciling them, and adding lessons on React, SQL, auth and deployment, is
> the next job.
