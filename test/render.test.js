// ============================================================================
// test/render.test.js — DOES THE PAGE ACTUALLY RENDER
// ============================================================================
//
// This test exists because of a specific failure worth remembering.
//
// A regex in the syntax highlighter was malformed, so `new RegExp` threw the
// moment that module was imported. React never mounted and the site served a
// blank white page. Every other check passed while it was broken: the build
// succeeded, the HTML was served, the CSS and JavaScript both returned 200
// with the right content types, and the unit tests were green.
//
// None of them ever asked the only question that mattered — is there anything
// on the screen?
//
// So this loads the built site in a real browser and checks that React put
// something in #root. It is slower than the other tests and it is the one that
// would have caught it.
// ============================================================================

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const chrome = CHROME_CANDIDATES.find((p) => p && fs.existsSync(p));
const built = fs.existsSync('dist/index.html');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
};

/**
 * Serve dist/ with no API at all.
 *
 * That is deliberate: it is exactly what a static host provides, so this also
 * proves the library does not secretly depend on the backend.
 */
function serve(port) {
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      res.writeHead(404).end();
      return;
    }

    const file = path.join('dist', url.pathname === '/' ? 'index.html' : url.pathname);

    try {
      const body = await fs.promises.readFile(file);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      // The single-page-app fallback a static host would apply.
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(await fs.promises.readFile('dist/index.html'));
    }
  });

  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

async function render(url) {
  const { stdout } = await run(
    chrome,
    [
      '--headless',
      '--disable-gpu',
      '--no-sandbox',
      '--dump-dom',
      // Lets timers and fetches settle without waiting in real time.
      '--virtual-time-budget=8000',
      url,
    ],
    { maxBuffer: 20 * 1024 * 1024 }
  );
  return stdout;
}

// Skip rather than fail where Chrome is absent or nothing has been built —
// a missing browser on someone's machine is not a broken application.
const skip = !chrome
  ? 'no Chrome found'
  : !built
    ? 'no dist/ — run `npm run build` first'
    : false;

test('the cover renders at the root', { skip }, async (t) => {
  const server = await serve(4179);
  t.after(() => server.close());

  const dom = await render('http://localhost:4179/');

  // The specific check that would have caught the blank page. An empty #root
  // means React threw before it could mount.
  assert.doesNotMatch(dom, /<div id="root"><\/div>/, 'React did not mount — #root is empty');

  assert.match(dom, /cover__title/, 'the cover did not render');
  assert.match(dom, /Development/, 'the cover title is missing');
});

test('the contents page lists the topics', { skip }, async (t) => {
  const server = await serve(4181);
  t.after(() => server.close());

  const dom = await render('http://localhost:4181/#/contents');

  assert.doesNotMatch(dom, /<div id="root"><\/div>/, 'React did not mount');
  assert.match(dom, /shelf__title/, 'the topic shelves did not render');
  // The roman numerals prove the catalogue was read, not just that some
  // markup appeared.
  assert.match(dom, /shelf__numeral/, 'the chapter numerals are missing');
});

test('a lesson page renders its content', { skip }, async (t) => {
  const server = await serve(4180);
  t.after(() => server.close());

  const dom = await render('http://localhost:4180/#/lesson/html-basics');

  assert.doesNotMatch(dom, /<div id="root"><\/div>/, 'React did not mount');
  assert.match(dom, /class="prose"/, 'lesson content did not load');

  // Each of these proves a separate part of enhance() survived.
  //
  // The loose version of this test — matching /prose/ — passed for a long time
  // while every one of them was silently broken: React was re-applying the raw
  // HTML and wiping the enhancement on the next render. Assert the thing you
  // actually care about, not something that happens to appear nearby.
  assert.match(dom, /tok-keyword|tok-comment|tok-string/, 'syntax highlighting did not survive');
  assert.match(dom, /copy-button/, 'copy buttons did not survive');
  assert.match(dom, /<h2 id="/, 'heading ids are missing, so the outline cannot link');
});

test('runnable examples get a Run button', { skip }, async (t) => {
  const server = await serve(4182);
  t.after(() => server.close());

  // The HTML lesson has the most runnable blocks, so it is the clearest case.
  const dom = await render('http://localhost:4182/#/lesson/html-basics');

  assert.match(dom, /run-button/, 'no Run buttons were added');
  assert.match(dom, /data-runnable="html"/, 'HTML examples were not detected as runnable');

  // And the blocks that cannot run must NOT get one. A control that sometimes
  // does nothing teaches readers to distrust it.
  const shellLesson = await render('http://localhost:4182/#/lesson/node-basics');
  const runnableCount = (shellLesson.match(/data-runnable/g) ?? []).length;
  const blockCount = (shellLesson.match(/<pre/g) ?? []).length;
  assert.ok(
    runnableCount < blockCount,
    'every block was marked runnable, including the Node and shell ones'
  );
});
