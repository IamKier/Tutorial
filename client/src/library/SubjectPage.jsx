// ============================================================================
// SubjectPage — THE SHELF
// ============================================================================
//
// One subject's volumes, stood up on a shelf. Each book is a card shaped like
// a cover, with a darker spine down its left edge and its volume number at the
// foot — near enough to a real book that you know what you are looking at,
// without pretending to be a photograph of one.
// ============================================================================

import { getSubject, bookMinutes, roman } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function SubjectPage({ subjectId, progress }) {
  const subject = getSubject(subjectId);

  if (!subject) {
    return (
      <div className="page">
        <h1>Subject not found</h1>
        <p className="lead">
          Nothing on the shelves matches that. <a href={href.subjects()}>Back to the catalogue</a>.
        </p>
      </div>
    );
  }

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href.subjects()}>Library</a>
        <Icon name="chevronRight" />
        <span aria-current="page">{subject.title}</span>
      </nav>

      <header className="topic-head">
        <span className="topic-head__numeral">Subject</span>
        <h1 className="topic-head__title">{subject.title}</h1>
        <p className="topic-head__tagline">{subject.tagline}</p>
      </header>

      <p className="topic-head__meta">
        {subject.books.length} volumes ·{' '}
        {progress.countIn(subject.books.flatMap((b) => b.chapters))} of{' '}
        {subject.books.flatMap((b) => b.chapters).length} chapters read
      </p>

      {/* The shelf itself. A rule beneath the row is drawn in CSS, so the
          books look stood on something rather than floating. */}
      <ul className="shelf-row" aria-label={`Volumes in ${subject.title}`}>
        {subject.books.map((book, index) => {
          const read = progress.countIn(book.chapters);
          const complete = read === book.chapters.length;

          return (
            <li key={book.id}>
              <a
                className={`book${complete ? ' is-complete' : ''}`}
                href={href.book(book.id)}
                // The spine colour is data, not design — it lives in the
                // catalogue so a new book brings its own.
                style={{ '--spine': book.spine }}
              >
                <span className="book__spine" aria-hidden="true" />

                <span className="book__face">
                  <span className="book__title">{book.title}</span>
                  <span className="book__tagline">{book.tagline}</span>

                  <span className="book__foot">
                    <span className="book__volume">{index === 0 ? '—' : roman(index)}</span>
                    <span className="book__chapters">
                      {book.chapters.length} ch · {bookMinutes(book)} min
                    </span>
                  </span>
                </span>

                {read > 0 && (
                  <span className="book__ribbon">{complete ? 'Read' : `${read}/${book.chapters.length}`}</span>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
