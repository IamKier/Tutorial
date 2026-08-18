// ============================================================================
// BookPage — ONE VOLUME, OPEN
// ============================================================================
//
// A book's contents page: its chapters, set with dotted leaders running from
// each title to its reading time, the way a printed table of contents does.
// ============================================================================

import { getBook, bookMinutes } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function BookPage({ bookId, progress }) {
  const book = getBook(bookId);

  if (!book) {
    return (
      <div className="page">
        <h1>Volume not found</h1>
        <p className="lead">
          That link does not match a book. <a href={href.library()}>Back to the catalogue</a>.
        </p>
      </div>
    );
  }

  const read = progress.countIn(book.chapters);

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href.library()}>Library</a>
        <Icon name="chevronRight" />
        <a href={href.subject(book.subjectId)}>{book.subjectTitle}</a>
        <Icon name="chevronRight" />
        <span aria-current="page">{book.title}</span>
      </nav>

      {/* A title page for the volume, with its spine colour as a rule beneath
          — the one place the book's identity carries through from the shelf. */}
      <header className="book-head" style={{ '--spine': book.spine }}>
        <span className="topic-head__numeral">Volume</span>
        <h1 className="topic-head__title">{book.title}</h1>
        <p className="topic-head__tagline">{book.tagline}</p>
      </header>

      <p className="topic-head__meta">
        {read} of {book.chapters.length} chapters read · {bookMinutes(book)} min in total
      </p>

      <ol className="lesson-list">
        {book.chapters.map((chapter, index) => {
          const isDone = progress.isDone(chapter.slug);
          const minutes = Math.max(1, Math.round(chapter.words / 200));

          return (
            <li key={chapter.slug}>
              <a
                className={`lesson-row${isDone ? ' is-done' : ''}`}
                href={href.lesson(chapter.slug)}
              >
                <span className="lesson-row__number">{isDone ? '✓' : index + 1}</span>
                <span className="lesson-row__title">{chapter.title}</span>
                {/* Purely decorative, so hidden from screen readers. */}
                <span className="lesson-row__leader" aria-hidden="true" />
                <span className="lesson-row__meta">
                  {chapter.level} · {minutes} min
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
