// ============================================================================
// runner.js — RUNNING THE EXAMPLES
// ============================================================================
//
// Executing code that appears on your own page is the kind of feature that
// quietly becomes a security hole, so the isolation is the design.
//
// Two mechanisms, chosen to fit what is being run:
//
//   JavaScript  ->  a Web Worker, created from a blob
//   HTML / CSS  ->  a sandboxed iframe
//
// A Worker has no DOM, no `document`, no `window`, and no access to this
// page's variables or storage. It runs on its own thread, which means an
// infinite loop cannot freeze the library — and it can be terminated outright,
// which is the only reliable way to stop one.
//
// It is not a vacuum, though: a Worker does have `fetch`. The site's
// Content-Security-Policy confines that to this origin, so an example cannot
// send anything to a third party, but it is worth knowing the sandbox is
// "cannot reach the page" rather than "cannot reach anything".
//
// The iframe carries `sandbox="allow-scripts"` without `allow-same-origin`,
// which gives it an opaque origin: it cannot read our cookies, our storage or
// our DOM even though it was served from the same site.
//
// A note on what does NOT run: inline <script> inside an HTML example is
// blocked by the site's Content-Security-Policy. That is deliberate. Relaxing
// the policy to 'unsafe-inline' to allow it would weaken the whole site's
// defence against injected script — a bad trade for a demo. Markup and styles
// render; scripting examples go through the JavaScript path instead.
// ============================================================================

/** How long an example gets before it is assumed to be stuck. */
const TIMEOUT_MS = 2000;

/**
 * Run JavaScript and collect whatever it logs.
 *
 * Resolves to { logs, error, timedOut }. It never rejects — a failed example
 * is a result to display, not an exception for the caller to handle.
 */
export function runJavaScript(code) {
  return new Promise((resolve) => {
    // The worker's own source. `console` inside a Worker exists but writes to
    // the browser's console, not ours — so we replace it with something that
    // posts each line back to the page.
    const harness = `
      const logs = [];

      function serialise(value) {
        if (typeof value === 'string') return value;
        if (value instanceof Error) return value.name + ': ' + value.message;
        try {
          // Objects and arrays are far more useful printed out than as
          // "[object Object]".
          return JSON.stringify(value, null, 2) ?? String(value);
        } catch {
          // Circular structures cannot be stringified.
          return String(value);
        }
      }

      const record = (...args) => {
        logs.push(args.map(serialise).join(' '));
        // Post as we go rather than only at the end, so a run that later
        // times out still shows what it managed to print.
        self.postMessage({ type: 'log', logs });
      };

      console = { log: record, info: record, warn: record, error: record, debug: record };

      // Announce that the sandbox is up. The page starts its timeout from
      // here, so however long the browser took to spin up a worker is not
      // charged against the reader's code.
      self.postMessage({ type: 'ready' });

      self.onmessage = (event) => {
        try {
          // Indirect eval, so the code runs in the worker's global scope
          // rather than inside this function and closing over its variables.
          (0, eval)(event.data);
          self.postMessage({ type: 'done', logs });
        } catch (err) {
          self.postMessage({ type: 'error', logs, error: err.name + ': ' + err.message });
        }
      };
    `;

    let worker;
    let timer;
    let settled = false;
    const url = URL.createObjectURL(new Blob([harness], { type: 'text/javascript' }));

    const finish = (result) => {
      if (settled) return;
      settled = true;

      clearTimeout(timer);
      worker?.terminate();
      // Blob URLs are held in memory until revoked. Forgetting this is a slow
      // leak that only shows up after someone has run a hundred examples.
      URL.revokeObjectURL(url);

      resolve(result);
    };

    try {
      worker = new Worker(url);
    } catch (err) {
      // Usually a Content-Security-Policy that forbids blob: workers.
      finish({ logs: [], error: `Could not start the sandbox: ${err.message}`, timedOut: false });
      return;
    }

    worker.onmessage = (event) => {
      const { type, logs, error } = event.data;

      if (type === 'ready') {
        // Only now does the clock start, and only now is there code to run.
        //
        // The whole reason for using a Worker: an endless loop costs one
        // background thread and is stopped by terminate(). On the main thread
        // it would lock the page and the only cure would be closing the tab.
        timer = setTimeout(() => finish({ logs: [], error: null, timedOut: true }), TIMEOUT_MS);
        worker.postMessage(code);
        return;
      }

      if (type === 'log') return; // interim update; wait for the end

      finish({ logs, error: error ?? null, timedOut: false });
    };

    worker.onerror = (event) => {
      finish({ logs: [], error: event.message ?? 'Something went wrong', timedOut: false });
    };
  });
}

/**
 * Build the document for an HTML or CSS example.
 *
 * A bare CSS rule renders nothing on its own, so a CSS example is given a
 * little markup to apply itself to. HTML examples are shown as written.
 */
export function buildPreviewDocument(code, kind) {
  const base = `
    <style>
      body {
        margin: 0;
        padding: 12px;
        font-family: system-ui, sans-serif;
        font-size: 14px;
        line-height: 1.5;
        color: #2a2520;
        background: #fbf8f1;
      }
    </style>
  `;

  if (kind === 'css') {
    // Generic elements the rule can bite on. Not every example will match,
    // and that is honest — a rule for `.card` shows nothing without a card.
    return `${base}<style>${code}</style>
      <div class="card box container wrapper">
        <h2 class="title heading">A heading</h2>
        <p class="text lead">A paragraph of text to style.</p>
        <button class="button btn">A button</button>
      </div>`;
  }

  return base + code;
}

/**
 * Decide what a code block contains, and whether it can be run at all.
 *
 * Deliberately conservative. Offering Run on something that cannot work —
 * a shell command, a server file that needs Node — is worse than not offering
 * it, because the reader learns not to trust the button.
 */
export function detectKind(code) {
  const text = code.trim();

  // Shell sessions and PowerShell. Nothing to run in a browser.
  if (/^(npm |node |cd |git |curl |Invoke-|Start-|\$env:|# )/m.test(text)) return null;

  // Server-side JavaScript: needs Node's built-ins, which do not exist here.
  if (/require\(|from '(node:|\.\/)|import .* from 'node:/.test(text)) return null;

  // Browser APIs that need a real page. The examples using them are
  // illustrative rather than self-contained.
  if (/document\.|window\.|localStorage|addEventListener|fetch\(/.test(text)) return null;

  // A full document, or markup.
  if (/^<!DOCTYPE|^<html|^<[a-z]+[\s>]/i.test(text)) return 'html';

  // A CSS rule: a selector, a brace, a declaration with a colon and semicolon.
  if (/^[.#@a-z][^{};]*\{[^}]*:[^}]*;?[^}]*\}/im.test(text) && !/=>|function|const |let /.test(text)) {
    return 'css';
  }

  // Plain JavaScript. Only worth running if it prints something — otherwise
  // the reader clicks Run and gets an empty box, which teaches nothing.
  if (/console\.log|console\.table/.test(text)) return 'js';

  return null;
}
