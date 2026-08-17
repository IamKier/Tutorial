// ============================================================================
// learn.js — THE LESSON SITE
// ============================================================================
//
// Builds the sidebar, loads lessons, tracks what you have finished, and adds
// the reading conveniences: search, a page outline, scroll progress and
// keyboard shortcuts.
//
// It is a small single-page application written by hand, and worth reading as
// an example in its own right — it uses fetch, the DOM, event delegation, the
// URL hash and localStorage, which is most of the JavaScript half of this
// course.
//
// Sections:
//   1. The course      — the single source of truth for every lesson
//   2. Progress        — saved in localStorage
//   3. The sidebar
//   4. Search
//   5. The router      — turning a URL into a lesson
//   6. Page outline    — "on this page" and scroll progress
//   7. Content polish  — syntax highlighting, copy buttons
//   8. Chrome          — theme, drawer, keyboard shortcuts
//   9. Startup
// ============================================================================

// ----------------------------------------------------------------------------
// 1. THE COURSE
//
// Every lesson in the site is listed here. Adding one means adding an entry to
// this array and dropping a matching file in lessons/ — the sidebar, the
// progress bars, the search and the previous/next links all read from this and
// update themselves.
//
// Keeping a structure like this in ONE place, rather than spreading it across
// the markup, is what stops a site drifting out of sync with itself.
// ----------------------------------------------------------------------------
const TOPICS = [
  {
    title: 'Start here',
    lessons: [{ slug: 'welcome', title: 'How this works' }],
  },
  {
    title: 'HTML',
    lessons: [
      { slug: 'html-basics', title: 'The basics' },
      { slug: 'html-forms', title: 'Forms and input' },
      { slug: 'html-semantic', title: 'Semantics and accessibility' },
    ],
  },
  {
    title: 'CSS',
    lessons: [
      { slug: 'css-basics', title: 'The basics' },
      { slug: 'css-layout', title: 'Layout: flexbox and grid' },
      { slug: 'css-systems', title: 'Variables, themes, responsive' },
    ],
  },
  {
    title: 'JavaScript',
    lessons: [
      { slug: 'js-basics', title: 'The basics' },
      { slug: 'js-dom', title: 'The DOM and events' },
      { slug: 'js-async', title: 'Async, promises and fetch' },
    ],
  },
  {
    title: 'How the web works',
    lessons: [{ slug: 'web-http', title: 'HTTP, requests, responses' }],
  },
  {
    title: 'Backend with Node',
    lessons: [
      { slug: 'node-basics', title: 'Node fundamentals' },
      { slug: 'node-api', title: 'Building a REST API' },
    ],
  },
  {
    title: 'Data',
    lessons: [{ slug: 'data-storage', title: 'Storing and modelling data' }],
  },
  {
    title: 'The project',
    lessons: [{ slug: 'project-tour', title: 'Tour of the task tracker' }],
  },
];

// A flat list, in reading order, for previous/next and progress counts.
// `flatMap` maps each topic to its lessons and flattens the result in one step.
const LESSONS = TOPICS.flatMap((topic) =>
  topic.lessons.map((lesson) => ({ ...lesson, topic: topic.title }))
);

const el = {
  nav: document.getElementById('nav'),
  navEmpty: document.getElementById('nav-empty'),
  search: document.getElementById('search'),
  prose: document.getElementById('prose'),
  eyebrow: document.getElementById('eyebrow'),
  content: document.getElementById('lesson'),
  lessonNav: document.getElementById('lesson-nav'),
  prevLink: document.getElementById('prev-link'),
  prevTitle: document.getElementById('prev-title'),
  nextLink: document.getElementById('next-link'),
  nextTitle: document.getElementById('next-title'),
  progressText: document.getElementById('progress-text'),
  progressFill: document.getElementById('progress-fill'),
  readProgress: document.getElementById('read-progress'),
  resetProgress: document.getElementById('reset-progress'),
  toc: document.getElementById('toc'),
  tocList: document.getElementById('toc-list'),
  sidebar: document.getElementById('sidebar'),
  menuToggle: document.getElementById('menu-toggle'),
  topbarTitle: document.getElementById('topbar-title'),
  scrim: document.getElementById('scrim'),
  themeToggle: document.getElementById('theme-toggle'),
  shortcuts: document.getElementById('shortcuts'),
};

// ----------------------------------------------------------------------------
// 2. PROGRESS
//
// localStorage holds strings and nothing else, so anything structured has to be
// stringified on the way in and parsed on the way out. A Set is the right shape
// in memory — it answers "is this done?" instantly and cannot hold duplicates —
// so we convert at the boundary in both directions.
// ----------------------------------------------------------------------------
const STORAGE_KEY = 'learn-progress';

function loadProgress() {
  try {
    return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? []);
  } catch {
    // Corrupt or hand-edited data should not brick the site. Start fresh.
    return new Set();
  }
}

let completed = loadProgress();

function saveProgress() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
}

// ----------------------------------------------------------------------------
// 3. THE SIDEBAR
//
// Built once from TOPICS. After that only the classes change — rebuilding it
// on every navigation would lose the scroll position and any active search.
// ----------------------------------------------------------------------------
const CHECK_SVG =
  '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

function buildSidebar() {
  const fragment = document.createDocumentFragment();

  TOPICS.forEach((topic, topicIndex) => {
    const section = document.createElement('section');
    section.className = 'nav__topic';
    section.dataset.topic = topic.title;

    const heading = document.createElement('h2');
    heading.className = 'nav__heading';

    const number = document.createElement('span');
    number.className = 'nav__number';
    number.textContent = topicIndex;

    const headingText = document.createElement('span');
    headingText.className = 'nav__heading-text';
    headingText.textContent = topic.title;

    // "2/3" — how far through this topic you are.
    const count = document.createElement('span');
    count.className = 'nav__topic-count';

    heading.append(number, headingText, count);

    const list = document.createElement('ul');
    list.className = 'nav__list';

    for (const lesson of topic.lessons) {
      const item = document.createElement('li');
      // Lower-cased once here so the search filter does not redo it on every
      // keystroke.
      item.dataset.search = `${lesson.title} ${topic.title}`.toLowerCase();

      const link = document.createElement('a');
      link.className = 'nav__link';
      // A real href, so the link can be middle-clicked, bookmarked and read as
      // a link. The router listens for the hash change rather than
      // intercepting the click.
      link.href = `#/${lesson.slug}`;
      link.dataset.slug = lesson.slug;

      const dot = document.createElement('span');
      dot.className = 'nav__dot';
      dot.innerHTML = CHECK_SVG;

      const text = document.createElement('span');
      text.className = 'nav__text';
      text.textContent = lesson.title;

      link.append(dot, text);
      item.append(link);
      list.append(item);
    }

    section.append(heading, list);
    fragment.append(section);
  });

  // Append the whole tree in one operation. Building into a fragment and
  // attaching once means the browser lays the page out a single time instead of
  // on every insertion.
  el.nav.replaceChildren(fragment);
}

/** Refresh the current/done markers without rebuilding the sidebar. */
function updateSidebarState(currentSlug) {
  for (const link of el.nav.querySelectorAll('.nav__link')) {
    const { slug } = link.dataset;
    link.classList.toggle('is-current', slug === currentSlug);
    link.classList.toggle('is-done', completed.has(slug));

    // `aria-current="page"` is how a screen reader announces which item in a
    // navigation list you are on. The highlight colour only works for people
    // who can see it.
    if (slug === currentSlug) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }

  // Per-topic counts.
  for (const topic of TOPICS) {
    const section = el.nav.querySelector(`[data-topic="${CSS.escape(topic.title)}"]`);
    if (!section) continue;

    const done = topic.lessons.filter((l) => completed.has(l.slug)).length;
    section.querySelector('.nav__topic-count').textContent = `${done}/${topic.lessons.length}`;
    section.classList.toggle('is-complete', done === topic.lessons.length);
  }

  // Overall progress.
  const percent = Math.round((completed.size / LESSONS.length) * 100);
  el.progressText.textContent = `${completed.size} of ${LESSONS.length} done`;
  el.progressFill.style.width = `${percent}%`;
}

// ----------------------------------------------------------------------------
// 4. SEARCH
//
// Filtering a list of fifteen is not a performance problem, so this is
// deliberately the simplest thing that works: match on a lowercased string
// prepared once at build time, hide what does not match, and hide any topic
// left with nothing under it.
// ----------------------------------------------------------------------------
function applySearch() {
  const query = el.search.value.trim().toLowerCase();
  let visible = 0;

  for (const section of el.nav.querySelectorAll('.nav__topic')) {
    let matchesInTopic = 0;

    for (const item of section.querySelectorAll('li')) {
      const matches = !query || item.dataset.search.includes(query);
      item.classList.toggle('is-filtered', !matches);
      if (matches) matchesInTopic++;
    }

    section.classList.toggle('is-filtered', matchesInTopic === 0);
    visible += matchesInTopic;
  }

  el.navEmpty.hidden = visible > 0;
}

el.search.addEventListener('input', applySearch);

el.search.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    el.search.value = '';
    applySearch();
    el.search.blur();
  }

  // Enter opens the first visible result — so you can type three letters and
  // hit Enter without reaching for the mouse.
  if (event.key === 'Enter') {
    const first = el.nav.querySelector('li:not(.is-filtered) .nav__link');
    if (first) {
      location.hash = first.getAttribute('href');
      el.search.blur();
    }
  }
});

// ----------------------------------------------------------------------------
// 5. THE ROUTER
//
// The whole site is one HTML page. The part after the # decides which lesson
// is shown:
//
//     /learn/#/css-layout   ->  fetch lessons/css-layout.html
//
// The fragment is never sent to the server, so navigation costs nothing — but
// the back button, bookmarks and reload all still work, because the URL
// genuinely changes.
// ----------------------------------------------------------------------------

function currentSlug() {
  // location.hash looks like "#/css-layout". Strip the "#/" and fall back to
  // the first lesson when there is nothing there.
  const slug = location.hash.replace(/^#\/?/, '');
  return slug || LESSONS[0].slug;
}

async function showLesson(slug) {
  const index = LESSONS.findIndex((l) => l.slug === slug);

  if (index === -1) {
    el.prose.innerHTML =
      '<h1>Lesson not found</h1><p class="lead">That link does not match a lesson. Pick one from the sidebar.</p>';
    el.eyebrow.textContent = '';
    el.lessonNav.hidden = true;
    el.toc.hidden = true;
    return;
  }

  const lesson = LESSONS[index];

  try {
    const response = await fetch(`/learn/lessons/${slug}.html`);
    if (!response.ok) throw new Error(`Could not load lesson (${response.status})`);

    // innerHTML is safe HERE because this markup is ours — it comes from a file
    // we wrote, on our own server. The rule is not "never use innerHTML", it is
    // "never use innerHTML with input a user typed". Compare with app.js, where
    // task titles use textContent for exactly that reason.
    el.prose.innerHTML = await response.text();
  } catch (err) {
    el.prose.innerHTML = `<h1>Something went wrong</h1><p class="lead">${err.message}</p>`;
    return;
  }

  // Where you are, in words. Useful on a long course.
  el.eyebrow.textContent = `${lesson.topic} · Lesson ${index + 1} of ${LESSONS.length}`;
  el.topbarTitle.textContent = lesson.title;

  // The browser tab should say where you are — it is also what gets saved when
  // someone bookmarks the page.
  document.title = `${lesson.title} — Learn Fullstack`;

  enhanceCode();
  wrapTables();
  buildOutline();
  addDoneToggle(lesson);
  updateLessonNav(index);
  updateSidebarState(slug);

  window.scrollTo({ top: 0 });
  updateReadProgress();

  // Move keyboard focus to the lesson. Without this, someone navigating by
  // keyboard would still be back in the sidebar, and a screen reader would not
  // announce that the content changed — the classic accessibility hole in
  // single-page apps.
  el.content.focus();

  closeDrawer();
}

function updateLessonNav(index) {
  const prev = LESSONS[index - 1];
  const next = LESSONS[index + 1];

  el.lessonNav.hidden = false;

  el.prevLink.hidden = !prev;
  if (prev) {
    el.prevLink.href = `#/${prev.slug}`;
    el.prevTitle.textContent = prev.title;
  }

  el.nextLink.hidden = !next;
  if (next) {
    el.nextLink.href = `#/${next.slug}`;
    el.nextTitle.textContent = next.title;
  }
}

/** The "mark as complete" button at the end of every lesson. */
function addDoneToggle(lesson) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'done-toggle';
  button.id = 'done-toggle';

  const paint = () => {
    const isDone = completed.has(lesson.slug);
    button.classList.toggle('is-done', isDone);
    button.innerHTML = isDone ? CHECK_SVG : '';
    button.append(isDone ? 'Completed' : 'Mark as complete');
    button.setAttribute('aria-pressed', String(isDone));
  };

  button.addEventListener('click', () => {
    // A Set makes this pleasant: add, delete, has. No index juggling.
    if (completed.has(lesson.slug)) completed.delete(lesson.slug);
    else completed.add(lesson.slug);

    saveProgress();
    paint();
    updateSidebarState(lesson.slug);
  });

  paint();
  el.prose.append(button);
}

// ----------------------------------------------------------------------------
// 6. PAGE OUTLINE
// ----------------------------------------------------------------------------

/** "The DOM and events" -> "the-dom-and-events" */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // drop punctuation
    .trim()
    .replace(/\s+/g, '-');
}

let outlineLinks = [];
let outlineHeadings = [];

function buildOutline() {
  // Only h2s. Including h3s makes the rail as long as the lesson, which
  // defeats the point of a summary.
  outlineHeadings = [...el.prose.querySelectorAll('h2')];

  if (outlineHeadings.length < 2) {
    el.toc.hidden = true;
    outlineLinks = [];
    return;
  }

  const fragment = document.createDocumentFragment();

  outlineHeadings.forEach((heading, index) => {
    // Headings need an id to be linkable. Suffix with the index so two
    // sections called "Exercises" cannot collide.
    heading.id = heading.id || `${slugify(heading.textContent)}-${index}`;

    const item = document.createElement('li');
    const link = document.createElement('a');
    link.className = 'toc__link';
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;

    // A plain href to an id would be handled by the browser, but our router
    // listens to hashchange and would try to load a lesson called
    // "the-dom-and-events". So we scroll ourselves and leave the URL alone.
    link.addEventListener('click', (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    item.append(link);
    fragment.append(item);
  });

  el.tocList.replaceChildren(fragment);
  el.toc.hidden = false;
  outlineLinks = [...el.tocList.querySelectorAll('.toc__link')];
}

/**
 * Update the scroll bar at the top and highlight the section you are in.
 *
 * Called from a scroll listener, so it has to be cheap — it reads a few
 * numbers and sets two things. Anything heavier here makes scrolling stutter.
 */
function updateReadProgress() {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  // Guard the divide: on a short lesson there is nothing to scroll, and 0/0
  // would be NaN.
  const percent = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  el.readProgress.style.width = `${Math.min(percent, 100)}%`;

  if (outlineLinks.length === 0) return;

  // The active section is the last heading that has scrolled past the top of
  // the window (with a little slack so it activates as it arrives, not after).
  let activeIndex = 0;
  outlineHeadings.forEach((heading, index) => {
    if (heading.getBoundingClientRect().top <= 120) activeIndex = index;
  });

  outlineLinks.forEach((link, index) => {
    link.classList.toggle('is-active', index === activeIndex);
  });
}

// Scroll events fire far faster than the screen refreshes. Coalescing them
// with requestAnimationFrame means the work happens at most once per frame,
// which is the difference between smooth scrolling and jank.
let scrollQueued = false;
window.addEventListener(
  'scroll',
  () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(() => {
      updateReadProgress();
      scrollQueued = false;
    });
  },
  // We never call preventDefault here, and saying so lets the browser scroll
  // without waiting to find out.
  { passive: true }
);

window.addEventListener('resize', updateReadProgress);

// ----------------------------------------------------------------------------
// 7. CONTENT POLISH
// ----------------------------------------------------------------------------

// A deliberately small syntax highlighter. Real ones understand the language;
// this one recognises four kinds of token, which is enough to make code
// readable at a glance.
//
// The alternation order matters: comments and strings come first, so a keyword
// inside a string is not coloured as a keyword.
const TOKEN_RE = new RegExp(
  [
    '(?<comment>//[^\\n]*|/\\*[\\s\\S]*?\\*/|<!--[\\s\\S]*?-->)',
    '(?<string>\'(?:[^\'\\\\\\n]|\\\\.)*\'|"(?:[^"\\\\\\n]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`)',
    '(?<keyword>\\b(?:const|let|var|function|return|if|else|for|of|in|while|await|async|class|new|try|catch|finally|import|export|from|throw|typeof|instanceof|null|true|false|undefined|this)\\b)',
    '(?<number>\\b\\d+(?:\\.\\d+)?\\b)',
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

    // The plain text between the previous token and this one.
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

function enhanceCode() {
  for (const pre of el.prose.querySelectorAll('pre')) {
    const code = pre.querySelector('code');
    if (code) highlight(code);

    const bar = document.createElement('div');
    bar.className = 'code-bar';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy-button';
    button.textContent = 'Copy';

    button.addEventListener('click', async () => {
      // The clipboard API is asynchronous and can be refused — for instance on
      // a page served over plain HTTP that is not localhost. Hence the catch.
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

    bar.append(button);
    pre.append(bar);
  }
}

/** Put wide tables in their own scroll container so the page never scrolls sideways. */
function wrapTables() {
  for (const table of el.prose.querySelectorAll('table')) {
    const wrapper = document.createElement('div');
    wrapper.className = 'table-scroll';
    table.replaceWith(wrapper);
    wrapper.append(table);
  }
}

// ----------------------------------------------------------------------------
// 8. CHROME
// ----------------------------------------------------------------------------

function toggleTheme() {
  // What is on screen may come from the OS setting rather than a saved choice,
  // so ask the browser what it is actually painting instead of assuming.
  const current =
    document.documentElement.dataset.theme ||
    (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem('theme', next);
}

el.themeToggle.addEventListener('click', toggleTheme);

function openDrawer() {
  el.sidebar.classList.add('is-open');
  el.scrim.hidden = false;
  el.menuToggle.setAttribute('aria-expanded', 'true');
}

function closeDrawer() {
  el.sidebar.classList.remove('is-open');
  el.scrim.hidden = true;
  el.menuToggle.setAttribute('aria-expanded', 'false');
}

el.menuToggle.addEventListener('click', () => {
  if (el.sidebar.classList.contains('is-open')) closeDrawer();
  else openDrawer();
});

el.scrim.addEventListener('click', closeDrawer);

el.resetProgress.addEventListener('click', () => {
  if (!confirm('Clear your progress through the lessons?')) return;
  completed = new Set();
  saveProgress();
  updateSidebarState(currentSlug());
  showLesson(currentSlug());
});

/** Move n lessons forward or back from where we are. */
function step(offset) {
  const index = LESSONS.findIndex((l) => l.slug === currentSlug());
  const target = LESSONS[index + offset];
  if (target) location.hash = `#/${target.slug}`;
}

// ---- Keyboard shortcuts ------------------------------------------------------
document.addEventListener('keydown', (event) => {
  // Escape always works, even from a field.
  if (event.key === 'Escape') {
    closeDrawer();
    el.shortcuts.hidden = true;
    return;
  }

  // Otherwise: ignore keystrokes while someone is typing, or they cannot type
  // the letter "t" in the search box without the theme flipping.
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

  switch (event.key) {
    case '/':
      // Stop the "/" itself being typed into the field we are about to focus.
      event.preventDefault();
      el.search.focus();
      el.search.select();
      break;
    case '[':
      step(-1);
      break;
    case ']':
      step(1);
      break;
    case 'm':
      document.getElementById('done-toggle')?.click();
      break;
    case 't':
      toggleTheme();
      break;
    case '?':
      el.shortcuts.hidden = !el.shortcuts.hidden;
      break;
  }
});

// Clicking the backdrop closes the shortcuts panel. The check makes sure a
// click inside the panel does not count.
el.shortcuts.addEventListener('click', (event) => {
  if (event.target === el.shortcuts) el.shortcuts.hidden = true;
});

// ----------------------------------------------------------------------------
// 9. STARTUP
// ----------------------------------------------------------------------------

// `hashchange` fires whenever the part after # changes — including when the
// back button takes you to a previous lesson. Listening for it is all the
// routing this site needs.
window.addEventListener('hashchange', () => showLesson(currentSlug()));

buildSidebar();
updateSidebarState(currentSlug());
showLesson(currentSlug());
