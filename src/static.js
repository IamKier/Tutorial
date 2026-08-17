// ============================================================================
// static.js — SERVING FILES
// ============================================================================
//
// Reads files out of public/ and sends them. This is fundamentally all a
// static host like Netlify or GitHub Pages does.
// ============================================================================

import fs from 'node:fs/promises';
import path from 'node:path';
import { PUBLIC_DIR, IS_PRODUCTION } from './config.js';
import { HttpError } from './http.js';

// The browser must be told what kind of file it is receiving. Send CSS without
// the right Content-Type and it renders as plain text with nothing in the
// console to explain why your styles vanished.
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

// How long a browser may reuse a file without asking again. HTML is never
// cached, because it is the file that points at everything else — cache it and
// people keep loading the old version of your app after a deploy.
const CACHE_CONTROL = {
  html: 'no-cache',
  asset: IS_PRODUCTION ? 'public, max-age=3600' : 'no-cache',
};

export async function serveStatic(req, res, pathname) {
  // A path ending in "/" means a folder, and the file to send for a folder is
  // index.html inside it. That is why linking to a folder works on almost
  // every website.
  let requested = pathname;
  if (requested.endsWith('/')) requested += 'index.html';

  // ---- SECURITY: path traversal ------------------------------------------
  // Without this check, `GET /../../src/config.js` — or
  // `/../../../../etc/passwd` — escapes the public folder and serves any file
  // on the machine. It is one of the oldest bugs on the web and it still ships
  // regularly.
  //
  // Resolve the path first, then verify the RESULT sits inside the folder.
  // Never try to strip ".." out of the string: there are too many ways to
  // encode it and you will miss one.
  //
  // The trailing separator matters too — without it, a sibling folder named
  // "public-secret" would also pass, because its path starts with the same
  // characters.
  const filePath = path.join(PUBLIC_DIR, requested);

  if (filePath !== PUBLIC_DIR && !filePath.startsWith(PUBLIC_DIR + path.sep)) {
    throw new HttpError(403, 'Forbidden');
  }
  // -------------------------------------------------------------------------

  let content;
  let ext = path.extname(filePath).toLowerCase();

  try {
    content = await fs.readFile(filePath);
  } catch (err) {
    if (err.code !== 'ENOENT' && err.code !== 'EISDIR') throw err;

    // ---- Single-page-app fallback ------------------------------------------
    // React renders every screen from one HTML file, so a URL like /login has
    // no file of its own. Anything without a file extension is treated as an
    // app route and served index.html; React then decides what to show.
    //
    // The extension check matters: a missing /js/main.js must still 404. If it
    // quietly returned HTML instead, the browser would try to execute a web
    // page as JavaScript and the error would make no sense at all.
    if (ext) throw new HttpError(404, 'Not found');

    try {
      content = await fs.readFile(path.join(PUBLIC_DIR, 'index.html'));
      ext = '.html';
    } catch {
      throw new HttpError(
        404,
        'Not found. If this is a fresh clone, run: npm install && npm run build'
      );
    }
  }

  res.writeHead(200, {
    // A file type we do not recognise is sent as raw bytes, which browsers
    // download rather than render. Safer than guessing.
    'Content-Type': MIME_TYPES[ext] ?? 'application/octet-stream',
    'Content-Length': content.length,
    'Cache-Control': ext === '.html' ? CACHE_CONTROL.html : CACHE_CONTROL.asset,
  });

  // A HEAD request wants the headers and nothing else.
  res.end(req.method === 'HEAD' ? undefined : content);
}
