// ============================================================================
// catalogue.js — THE LIBRARY'S INDEX
// ============================================================================
//
// The whole library is described here and nowhere else:
//
//     Library → Subject → Book → Chapter
//
// A subject is a field of study. A book is a volume within it. A chapter is
// one sitting's reading, and corresponds to one file in public/lessons/.
//
// Adding a chapter means adding an entry here and dropping a file in
// public/lessons/. Adding a whole subject means one more object in SUBJECTS.
// The shelves, the search, the progress bars and the previous/next links all
// read from this array, so nothing else needs to know.
//
// Keeping the structure in ONE place is what stops a growing site drifting out
// of sync with itself — the alternative is a hand-maintained menu that slowly
// stops matching the pages it links to.
// ============================================================================

/**
 * `words` is measured from the actual chapter file. It drives the reading-time
 * estimate, which matters more than it sounds: knowing something is a
 * six-minute read rather than an unknown quantity is the difference between
 * starting it now and putting it off.
 *
 * `spine` is the colour of the book on the shelf. Books are told apart at a
 * glance by colour long before anyone reads the titles.
 */
export const SUBJECTS = [
  {
    id: 'web-development',
    title: 'Web Development',
    tagline: 'Building for the browser, the server, and the database beneath',
    note: 'Nine volumes, from the structure of a page to the queries behind it. Read in order — each assumes the ones before it.',
    books: [
      {
        id: 'start',
        title: 'Start Here',
        tagline: 'How the library works and how to use it',
        spine: '#6b6155',
        chapters: [{ slug: 'welcome', title: 'How this works', level: 'Basics', words: 658 }],
      },
      {
        id: 'html',
        title: 'HTML',
        tagline: 'The structure of every page on the web',
        spine: '#8a3324',
        chapters: [
          { slug: 'html-basics', title: 'The basics', level: 'Basics', words: 1254 },
          { slug: 'html-forms', title: 'Forms and input', level: 'Basics', words: 1259 },
          {
            slug: 'html-semantic',
            title: 'Semantics and accessibility',
            level: 'Intermediate',
            words: 1252,
          },
        ],
      },
      {
        id: 'css',
        title: 'CSS',
        tagline: 'Layout, colour, and making it work on a phone',
        spine: '#2f5d62',
        chapters: [
          { slug: 'css-basics', title: 'The basics', level: 'Basics', words: 1443 },
          { slug: 'css-layout', title: 'Layout: flexbox and grid', level: 'Basics', words: 1384 },
          {
            slug: 'css-systems',
            title: 'Variables, themes, responsive',
            level: 'Intermediate',
            words: 1409,
          },
        ],
      },
      {
        id: 'javascript',
        title: 'JavaScript',
        tagline: 'The only language that runs in a browser',
        spine: '#8a6a1f',
        chapters: [
          { slug: 'js-basics', title: 'The basics', level: 'Basics', words: 1548 },
          { slug: 'js-dom', title: 'The DOM and events', level: 'Basics', words: 1530 },
          {
            slug: 'js-async',
            title: 'Async, promises and fetch',
            level: 'Intermediate',
            words: 1432,
          },
        ],
      },
      {
        id: 'react',
        title: 'React',
        tagline: 'Letting a framework keep the screen in step with your data',
        spine: '#3d5a80',
        chapters: [
          { slug: 'react-basics', title: 'Components and JSX', level: 'Basics', words: 1137 },
          {
            slug: 'react-state',
            title: 'State, effects and hooks',
            level: 'Intermediate',
            words: 1442,
          },
        ],
      },
      {
        id: 'web',
        title: 'The Web',
        tagline: 'What actually travels between browser and server',
        spine: '#4a6141',
        chapters: [
          { slug: 'web-http', title: 'HTTP, requests, responses', level: 'Basics', words: 1435 },
        ],
      },
      {
        id: 'node',
        title: 'Node',
        tagline: 'JavaScript on the server, and the API it serves',
        spine: '#5c4033',
        chapters: [
          { slug: 'node-basics', title: 'Node fundamentals', level: 'Basics', words: 1417 },
          { slug: 'node-api', title: 'Building a REST API', level: 'Intermediate', words: 1555 },
        ],
      },
      {
        id: 'data',
        title: 'Data',
        tagline: 'Storing things so they survive a restart',
        spine: '#6b3f5e',
        chapters: [
          {
            slug: 'data-storage',
            title: 'Storing and modelling data',
            level: 'Intermediate',
            words: 1697,
          },
          { slug: 'sql-basics', title: 'SQL and SQLite', level: 'Intermediate', words: 1733 },
        ],
      },
      {
        id: 'project',
        title: 'The Project',
        tagline: 'A real application, read line by line',
        spine: '#39404a',
        chapters: [
          {
            slug: 'project-tour',
            title: 'Tour of the project',
            level: 'Intermediate',
            words: 1415,
          },
        ],
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Derived views
//
// Everything below is calculated from SUBJECTS rather than maintained beside
// it. Two lists that have to agree are two lists that will eventually
// disagree.
// ---------------------------------------------------------------------------

/** Every book, carrying the subject it belongs to. */
export const BOOKS = SUBJECTS.flatMap((subject) =>
  subject.books.map((book) => ({
    ...book,
    subjectId: subject.id,
    subjectTitle: subject.title,
  }))
);

/** Every chapter in reading order, carrying its book and subject with it. */
export const CHAPTERS = BOOKS.flatMap((book) =>
  book.chapters.map((chapter) => ({
    ...chapter,
    bookId: book.id,
    bookTitle: book.title,
    subjectId: book.subjectId,
    subjectTitle: book.subjectTitle,
    // 200 words a minute is the usual estimate for ordinary prose. Technical
    // writing with code examples is read more slowly — perhaps 120 — so these
    // figures err low. Better that a chapter takes a little longer than
    // advertised than that the whole library looks like a day of work and
    // nobody starts it.
    minutes: Math.max(1, Math.round(chapter.words / 200)),
  }))
);

export const TOTAL_CHAPTERS = CHAPTERS.length;
export const TOTAL_BOOKS = BOOKS.length;
export const TOTAL_MINUTES = CHAPTERS.reduce((sum, chapter) => sum + chapter.minutes, 0);

export function getSubject(id) {
  return SUBJECTS.find((subject) => subject.id === id) ?? null;
}

export function getBook(id) {
  return BOOKS.find((book) => book.id === id) ?? null;
}

export function getChapter(slug) {
  return CHAPTERS.find((chapter) => chapter.slug === slug) ?? null;
}

/** Where a chapter sits in the whole library, for "Chapter 7 of 18". */
export function chapterIndex(slug) {
  return CHAPTERS.findIndex((chapter) => chapter.slug === slug);
}

/** Minutes of reading in one book. */
export function bookMinutes(book) {
  return book.chapters.reduce(
    (sum, chapter) => sum + Math.max(1, Math.round(chapter.words / 200)),
    0
  );
}

/**
 * 1 -> "I", 4 -> "IV", 9 -> "IX".
 *
 * For the volume numbers on the shelves. Written out rather than pulled from a
 * package: it is nine lines, and a dependency for this would be a dependency
 * to audit, update and eventually remove.
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
