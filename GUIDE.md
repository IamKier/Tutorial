# The code, file by file

A reference for the codebase, readable in your editor without running anything.

The full course lives at <http://localhost:3000/learn/> once the server is
running — it covers HTML, CSS, JavaScript, HTTP, Node and data modelling with
exercises. This document is the short version: what each file does and why it
is written that way.

---

## The one idea underneath everything

A web app is two programs that do not trust each other, passing messages.

```
   BROWSER                                       SERVER
   public/                                       server.js
   the user's machine                            yours
       |                                              |
       |  "GET /api/tasks — give me the tasks"        |
       | -------------------------------------------> |
       |                                              |   asks db.js
       |                                              |   reads tasks.json
       |  200 OK  [{"id":"a1","title":"Buy milk"}]    |
       | <------------------------------------------- |
       |                                              |
   draws the list
```

Three rules follow, and they explain most of the design decisions here:

**The browser can only ask.** It cannot read the database or open files. When
it needs data it sends a request and waits — which is why nearly every function
in `app.js` is `async`.

**The server cannot trust the browser.** Anyone can send any request they like,
bypassing your page entirely. This is why `server.js` re-validates the title
even though `index.html` already marked the input `required`.

**Each request stands alone.** HTTP is stateless — the server does not remember
anyone between requests.

---

## db.js — the data layer

Exports exactly four functions: `listTasks`, `createTask`, `updateTask`,
`deleteTask`. Create, Read, Update, Delete — **CRUD**. Almost every backend you
write is these four repeated for each kind of thing in the app.

This is the *only* file that knows data lives in a JSON file. `server.js` calls
`db.createTask(title)` and has no idea what happens inside. Swap the file for
SQLite and you rewrite this one file; nothing else changes.

Three details worth knowing:

**`readAll` catches `ENOENT` and returns `[]`** — no file means no tasks yet,
which is correct on a first run. It re-throws every other error, because
catching what you did not expect turns a debuggable crash into silent wrong
behaviour.

**`updateTask` copies fields one at a time**, rather than
`Object.assign(task, changes)`. That would let a caller rewrite the `id` or
invent new fields. It is called mass assignment and it has caused real breaches.

**`writeAll` rewrites the entire file on every change.** Fine for a few hundred
tasks, terrible for a few million — which is exactly why databases exist.

---

## server.js — the backend

Two jobs, like every backend.

### Serving files

`serveStatic` reads from `public/` and sends the bytes with the right
`Content-Type` — send CSS without it and the browser shows the text instead of
applying it, with nothing in the console to explain why.

The security check matters:

```js
const filePath = path.join(PUBLIC_DIR, requestedPath);
if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
  // 403
}
```

Without it, `GET /../../db.js` escapes the public folder and hands out any file
on the machine. This is **path traversal**. Resolve the path first and verify
the result is inside the folder — never string-replace `..` out, because
attackers have decades of encodings for it. The trailing `path.sep` stops a
sibling folder named `public-secret` passing the check.

### Answering the API

```
GET    /api/tasks       list
POST   /api/tasks       create
PATCH  /api/tasks/:id   update
DELETE /api/tasks/:id   delete
```

A plural noun for the collection, the same noun plus an id for one item, and the
method carrying the verb. That is what "RESTful" means in practice.

`handleApi` is a router: look at the method and path, decide which function
runs. Express's router is a nicer-syntaxed version of the same if-statements.

**`readJsonBody` loops over `req` with `for await`** because a request body
arrives in chunks as it crosses the network. The size cap in that loop is not
optional — without it, one endless body eats all the server's memory.

**One catch-all** wraps every handler, so a bug returns a clean 500 instead of
killing the process and disconnecting everyone.

---

## public/ — the frontend

### index.html

Structure only. The task list is an empty `<ul>` — tasks exist only in the live
DOM that JavaScript builds. View source and it stays empty; Inspect and it is
full. Telling those two apart prevents a lot of confusion.

The blocking script in the `<head>` applies your saved theme before the first
paint, so dark mode does not flash white on the way in.

### theme.css and styles.css

`theme.css` holds the design tokens — spacing, type, colour, shadow, motion —
and is shared with the lesson site, which is why both look like one product.
`styles.css` holds the app's components and almost never uses a raw value.

Dark mode is one block redefining tokens. No component rule changes.

Also in `theme.css`: `[hidden] { display: none !important }`. The browser's own
`[hidden]` rule has almost no specificity, so any class that sets `display`
beats it and the element stays visible — a genuinely baffling bug the first time
you meet it.

### app.js

Seven sections, and the structure survives into every framework:

1. **State** — `tasks` and `filter`. The single source of truth.
2. **Elements** — looked up once.
3. **API** — the `request()` wrapper.
4. **Formatting** — `relativeTime()`.
5. **Render** — rebuilds the list from state.
6. **Events** — one delegated listener.
7. **Startup** — `load()`.

Four things to take from it:

**`fetch` only rejects on network failure.** A 404 or a 500 is a successful
fetch — you must check `response.ok` yourself. That is the whole reason
`request()` exists rather than calling `fetch` in four places.

**`render()` redraws everything from state**, every time, and never asks what
changed. Slower than a surgical update, and enormously easier to get right.

**One click listener on the `<ul>`**, not one per button. Clicks bubble, so
`event.target` says what was hit. This is event delegation, and it is the right
default when elements come and go.

**`textContent`, never `innerHTML`, for user input.** `innerHTML` parses the
string as markup, so a task titled `<img src=x onerror=alert(1)>` runs code in
every visitor's browser. One word is the entire defence.

---

## Try breaking it

Reading code feels like understanding. Breaking it proves it. Undo each change
after.

1. Delete `event.preventDefault()` in the submit handler. Why does the page
   flash and clear the input?
2. Change `201` to `400` in the create handler. Where does the error message on
   screen come from, and which file chose its wording?
3. Change the `.css` entry in `MIME_TYPES` to `text/plain`. The Network tab
   says the file downloaded fine — so why is the page unstyled?
4. Comment out `await writeAll(tasks)` in `createTask`. The task appears. Reload.
   Where did it go, and why did it look like it worked?
5. Change `title.textContent` to `title.innerHTML`, then add a task called
   `<img src=x onerror=alert(1)>`. Change it straight back.

---

## What is deliberately missing

- **No accounts** — everyone shares one list. Adding users touches every layer
  and is the most instructive next feature.
- **No tests** — a real project would test `db.js` first, since it is pure logic.
- **No build step** — the browser gets exactly the files on disk.
- **A file, not a database** — including a real race condition. Open the app in
  two windows and add a task in each at the same instant; one can vanish. Both
  requests read the file, both write it back, and the second overwrites the
  first. That is a **lost update**, and it is why databases have transactions.
- **No rate limiting, HTTPS or pagination** — fine on localhost, not on the
  internet.

The lesson site's exercises work through most of these. Start at
<http://localhost:3000/learn/>.
