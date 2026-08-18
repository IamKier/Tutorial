// ============================================================================
// enhance.js — MAKING FETCHED HTML NICER
// ============================================================================
//
// Lesson content is HTML, fetched and inserted. These functions run over it
// afterwards to add the things the raw markup does not carry: syntax colours,
// copy buttons, scrollable tables, and ids on headings so the outline can link
// to them.
//
// This is plain DOM work inside a React app, which is unusual enough to
// explain. React is for markup you generate; this markup arrives as a string
// from a file. Rewriting 20,000 words of lesson content as JSX would gain
// nothing and lose the ability to edit a lesson without touching the app.
// ============================================================================

import { runJavaScript, buildPreviewDocument, detectKind } from './runner.js';

// A deliberately small syntax highlighter. Real ones parse the language; this
// recognises four kinds of token, which is enough to make code readable at a
// glance.
//
// The alternation order matters: comments and strings come first, so a keyword
// inside a string is not coloured as a keyword.
// Written as a regex LITERAL rather than built from strings.
//
// The string form needs every backslash doubled — '\\s' to mean \s — and a
// single lost backslash turns the pattern into something that either matches
// nothing or, as happened here once, throws at construction and takes the
// whole application down with it. A literal has no such escaping layer: what
// you read is what the engine gets.
const TOKEN_RE =
  /(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->)|(?<string>'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)|(?<keyword>\b(?:const|let|var|function|return|if|else|for|of|in|while|await|async|class|new|try|catch|finally|import|export|from|throw|typeof|instanceof|null|true|false|undefined|this)\b)|(?<number>\b\d+(?:\.\d+)?\b)/g;

function highlight(codeEl) {
  const text = codeEl.textContent;
  const fragment = document.createDocumentFragment();
  let lastIndex = 0;

  for (const match of text.matchAll(TOKEN_RE)) {
    // Exactly one named group matched; find which.
    const type = Object.keys(match.groups).find((key) => match.groups[key] !== undefined);

    if (match.index > lastIndex) fragment.append(text.slice(lastIndex, match.index));

    const span = document.createElement('span');
    span.className = `tok-${type}`;
    // textContent, not innerHTML — the samples contain things like <script>
    // and we want them shown, not executed.
    span.textContent = match[0];
    fragment.append(span);

    lastIndex = match.index + match[0].length;
  }

  fragment.append(text.slice(lastIndex));
  codeEl.replaceChildren(fragment);
}

function addCopyButtons(root) {
  for (const pre of root.querySelectorAll('pre')) {
    if (pre.querySelector('.copy-button')) continue; // already done

    const code = pre.querySelector('code');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = 'Copy';

    button.addEventListener('click', async () => {
      // The clipboard API is asynchronous and can be refused — on a page served
      // over plain HTTP that is not localhost, for instance. Hence the catch.
      try {
        await navigator.clipboard.writeText(code ? code.textContent : pre.textContent);
        button.textContent = 'Copied';
        button.classList.add('is-copied');
        setTimeout(() => {
          button.textContent = 'Copy';
          button.classList.remove('is-copied');
        }, 1500);
      } catch {
        button.textContent = 'Press Ctrl+C';
      }
    });

    pre.append(button);
  }
}

/**
 * Turn the examples that can run into ones you can run and edit.
 *
 * Only some blocks qualify — see detectKind. A Run button on a shell command
 * or a server file would do nothing, and a control that sometimes does nothing
 * is worse than no control, because the reader stops trusting it.
 */
function addRunners(root) {
  for (const pre of root.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    if (!code || pre.dataset.runnable) continue;

    const kind = detectKind(code.textContent);
    if (!kind) continue;

    pre.dataset.runnable = kind;

    // Editable, so an example is something to experiment with rather than
    // only to read. `plaintext-only` stops the browser inserting markup when
    // text is pasted in, which would otherwise appear inside the code.
    code.contentEditable = 'plaintext-only';
    code.spellcheck = false;
    // Re-highlight after an edit, but only once the reader has stopped typing:
    // rebuilding the DOM on every keystroke would move the caret.
    code.addEventListener('blur', () => highlight(code));

    const bar = document.createElement('div');
    bar.className = 'run-bar';

    const label = document.createElement('span');
    label.className = 'run-bar__kind';
    label.textContent = { js: 'JavaScript', html: 'HTML', css: 'CSS' }[kind];

    const run = document.createElement('button');
    run.type = 'button';
    run.className = 'run-button';
    run.textContent = 'Run';

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'run-reset';
    reset.textContent = 'Reset';
    reset.hidden = true;

    bar.append(label, reset, run);
    pre.before(bar);

    const output = document.createElement('div');
    output.className = 'run-output';
    output.hidden = true;
    pre.after(output);

    // Keep the original so an edited example can be put back. Without this,
    // one experiment leaves the lesson permanently altered for that visit.
    const original = code.textContent;

    reset.addEventListener('click', () => {
      code.textContent = original;
      highlight(code);
      output.hidden = true;
      reset.hidden = true;
    });

    run.addEventListener('click', async () => {
      const source = code.textContent;
      reset.hidden = source === original;

      output.hidden = false;
      output.className = 'run-output';
      output.textContent = 'Running…';

      if (kind === 'js') {
        run.disabled = true;
        const { logs, error, timedOut } = await runJavaScript(source);
        run.disabled = false;

        output.replaceChildren();

        if (timedOut) {
          output.classList.add('run-output--error');
          output.textContent =
            'Stopped after 2 seconds — this looks like an endless loop. ' +
            'It ran on its own thread, which is why the page kept working.';
          return;
        }

        if (logs.length === 0 && !error) {
          output.classList.add('run-output--muted');
          output.textContent = 'Ran without printing anything. Add a console.log to see a value.';
          return;
        }

        for (const line of logs) {
          const row = document.createElement('div');
          row.className = 'run-line';
          row.textContent = line;
          output.append(row);
        }

        if (error) {
          const row = document.createElement('div');
          row.className = 'run-line run-line--error';
          row.textContent = error;
          output.append(row);
        }
      } else {
        // HTML and CSS render rather than print.
        output.replaceChildren();

        const frame = document.createElement('iframe');
        frame.className = 'run-frame';
        frame.title = 'Example output';
        // allow-scripts WITHOUT allow-same-origin: the frame gets an opaque
        // origin, so it cannot reach this page's DOM, cookies or storage.
        // Granting both together would undo the sandbox entirely.
        frame.setAttribute('sandbox', 'allow-scripts');
        frame.srcdoc = buildPreviewDocument(source, kind);

        output.append(frame);
      }
    });
  }
}

/** Wide tables scroll inside their own box rather than pushing the page sideways. */
function wrapTables(root) {
  for (const table of root.querySelectorAll('table')) {
    if (table.parentElement?.classList.contains('table-scroll')) continue;

    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
}

/** "The DOM and events" -> "the-dom-and-events" */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

/**
 * Give every h2 an id and return the list, so the outline can link to them.
 * The index suffix means two sections both called "Exercises" cannot collide.
 */
function collectHeadings(root) {
  return [...root.querySelectorAll('h2')].map((heading, index) => {
    heading.id = heading.id || `${slugify(heading.textContent)}-${index}`;
    return { id: heading.id, text: heading.textContent, element: heading };
  });
}

/** Run everything over freshly inserted lesson HTML. Returns the headings. */
export function enhance(root) {
  for (const code of root.querySelectorAll('pre code')) highlight(code);
  addCopyButtons(root);
  addRunners(root);
  wrapTables(root);
  return collectHeadings(root);
}
