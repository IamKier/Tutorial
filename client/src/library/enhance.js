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

// A deliberately small syntax highlighter. Real ones parse the language; this
// recognises four kinds of token, which is enough to make code readable at a
// glance.
//
// The alternation order matters: comments and strings come first, so a keyword
// inside a string is not coloured as a keyword.
const TOKEN_RE = new RegExp(
  [
    '(?<comment>//[^\n]*|/\*[\s\S]*?\*/|<!--[\s\S]*?-->)',
    '(?<string>\'(?:[^\'\\\n]|\\.)*\'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)',
    '(?<keyword>\b(?:const|let|var|function|return|if|else|for|of|in|while|await|async|class|new|try|catch|finally|import|export|from|throw|typeof|instanceof|null|true|false|undefined|this)\b)',
    '(?<number>\b\d+(?:\.\d+)?\b)',
  ].join('|'),
  'g'
);

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
  wrapTables(root);
  return collectHeadings(root);
}
