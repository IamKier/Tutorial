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
    lessons: [{ slug: 'welcome', title: 'How this works', level: 'Basics', words: 577 }],
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
        title: 'Tour of the task tracker',
        level: 'Intermediate',
        words: 1648,
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
    // 200 words a minute is the usual estimate for ordinary prose. Code
    // examples are slower to read, so this errs low on purpose — better to
    // finish sooner than expected.
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
