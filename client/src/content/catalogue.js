// ============================================================================
// catalogue.js — THE LIBRARY'S INDEX
// ============================================================================
//
// Every topic and every lesson in the library is described here, and nowhere
// else. The home page, the sidebar, the search, the progress bars and the
// previous/next links all read from this one array.
//
// Adding a lesson means adding an entry here and dropping an HTML file in
// public/lessons/. Nothing else needs to know.
//
// Keeping a structure like this in ONE place is what stops a growing site
// drifting out of sync with itself — the alternative is a hand-maintained menu
// that slowly stops matching the pages it links to.
// ============================================================================

/**
 * `words` is measured from the actual lesson file. It drives the reading-time
 * estimate, which matters more than it sounds: knowing something is a
 * four-minute read rather than an unknown quantity is the difference between
 * starting it now and putting it off.
 */
export const TOPICS = [
  {
    id: 'start',
    title: 'Start here',
    tagline: 'How the library works and how to use it',
    icon: 'compass',
    lessons: [{ slug: 'welcome', title: 'How this works', level: 'Basics', words: 647 }],
  },
  {
    id: 'html',
    title: 'HTML',
    tagline: 'The structure of every page on the web',
    icon: 'layout',
    lessons: [
      { slug: 'html-basics', title: 'The basics', level: 'Basics', words: 1220 },
      { slug: 'html-forms', title: 'Forms and input', level: 'Basics', words: 1229 },
      {
        slug: 'html-semantic',
        title: 'Semantics and accessibility',
        level: 'Intermediate',
        words: 1217,
      },
    ],
  },
  {
    id: 'css',
    title: 'CSS',
    tagline: 'Layout, colour, and making it work on a phone',
    icon: 'palette',
    lessons: [
      { slug: 'css-basics', title: 'The basics', level: 'Basics', words: 1340 },
      { slug: 'css-layout', title: 'Layout: flexbox and grid', level: 'Basics', words: 1354 },
      {
        slug: 'css-systems',
        title: 'Variables, themes, responsive',
        level: 'Intermediate',
        words: 1383,
      },
    ],
  },
  {
    id: 'javascript',
    title: 'JavaScript',
    tagline: 'The only language that runs in a browser',
    icon: 'code',
    lessons: [
      { slug: 'js-basics', title: 'The basics', level: 'Basics', words: 1512 },
      { slug: 'js-dom', title: 'The DOM and events', level: 'Basics', words: 1489 },
      {
        slug: 'js-async',
        title: 'Async, promises and fetch',
        level: 'Intermediate',
        words: 1408,
      },
    ],
  },
  {
    id: 'react',
    title: 'React',
    tagline: 'Letting a framework keep the screen in step with your data',
    icon: 'layers',
    lessons: [
      { slug: 'react-basics', title: 'Components and JSX', level: 'Basics', words: 1092 },
      {
        slug: 'react-state',
        title: 'State, effects and hooks',
        level: 'Intermediate',
        words: 1412,
      },
    ],
  },
  {
    id: 'web',
    title: 'How the web works',
    tagline: 'What actually travels between browser and server',
    icon: 'globe',
    lessons: [
      { slug: 'web-http', title: 'HTTP, requests, responses', level: 'Basics', words: 1337 },
    ],
  },
  {
    id: 'node',
    title: 'Backend with Node',
    tagline: 'JavaScript on the server, and the API it serves',
    icon: 'server',
    lessons: [
      { slug: 'node-basics', title: 'Node fundamentals', level: 'Basics', words: 1367 },
      { slug: 'node-api', title: 'Building a REST API', level: 'Intermediate', words: 1508 },
    ],
  },
  {
    id: 'data',
    title: 'Data',
    tagline: 'Storing things so they survive a restart',
    icon: 'database',
    lessons: [
      {
        slug: 'data-storage',
        title: 'Storing and modelling data',
        level: 'Intermediate',
        words: 1642,
      },
      { slug: 'sql-basics', title: 'SQL and SQLite', level: 'Intermediate', words: 1692 },
    ],
  },
  {
    id: 'project',
    title: 'The project',
    tagline: 'A real app, read line by line',
    icon: 'box',
    lessons: [
      {
        slug: 'project-tour',
        title: 'Tour of the project',
        level: 'Intermediate',
        words: 1303,
      },
    ],
  },
];

/**
 * A flat list in reading order, each lesson carrying its topic with it.
 *
 * `flatMap` maps each topic to its lessons and flattens the result in one
 * step. Everything that needs "the lesson before this one" uses this.
 */
export const LESSONS = TOPICS.flatMap((topic) =>
  topic.lessons.map((lesson) => ({
    ...lesson,
    topicId: topic.id,
    topicTitle: topic.title,
    // 200 words a minute is the usual estimate for ordinary prose. Technical
    // writing with code examples is read more slowly than that — perhaps 120 —
    // so these figures err low. Better that a lesson takes a little longer
    // than advertised than that the whole library looks like a day of work
    // and nobody starts it.
    minutes: Math.max(1, Math.round(lesson.words / 200)),
  }))
);

export const TOTAL_LESSONS = LESSONS.length;
export const TOTAL_MINUTES = LESSONS.reduce((sum, lesson) => sum + lesson.minutes, 0);

export function getLesson(slug) {
  return LESSONS.find((lesson) => lesson.slug === slug) ?? null;
}

export function getTopic(id) {
  return TOPICS.find((topic) => topic.id === id) ?? null;
}

/** Where a lesson sits in the whole sequence, for "Lesson 7 of 15". */
export function lessonIndex(slug) {
  return LESSONS.findIndex((lesson) => lesson.slug === slug);
}

/**
 * 1 -> "I", 4 -> "IV", 9 -> "IX".
 *
 * Used for the topic numerals on the shelves. Written out rather than pulled
 * from a package: it is nine lines, and a dependency for this would be a
 * dependency to audit, update and eventually remove.
 */
export function roman(n) {
  const table = [
    [10, 'X'],
    [9, 'IX'],
    [5, 'V'],
    [4, 'IV'],
    [1, 'I'],
  ];

  let out = '';
  for (const [value, numeral] of table) {
    while (n >= value) {
      out += numeral;
      n -= value;
    }
  }
  return out;
}
