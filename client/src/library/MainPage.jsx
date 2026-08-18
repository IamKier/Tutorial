// ============================================================================
// MainPage — THE FRONT ROOM
// ============================================================================
//
// What you see on walking in. It answers, in this order:
//
//   Where was I?          the desk, with the chapter you stopped at
//   What is next?         the two after it, so the path is visible
//   How far have I got?   the ledger
//   What is here?         the subjects, previewed as their shelves
//
// A returning reader wants the first and nothing else, so it comes first and
// is the largest thing on the page. A new reader falls through to the last,
// which is where the library actually begins — and the desk and ledger are
// simply absent until there is something to put in them.
// ============================================================================

import {
  SUBJECTS,
  CHAPTERS,
  BOOKS,
  TOTAL_CHAPTERS,
  TOTAL_BOOKS,
  TOTAL_MINUTES,
  getBook,
  bookMinutes,
  hash,
} from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function MainPage({ progress }) {
  const unread = CHAPTERS.filter((chapter) => !progress.isDone(chapter.slug));
  const next = unread[0];
  const upNext = unread.slice(1, 4);

  const started = progress.total > 0;
  const finished = !next;

  const minutesLeft = unread.reduce((sum, chapter) => sum + chapter.minutes, 0);
  const hoursLeft = Math.max(1, Math.round(minutesLeft / 60));

  const volumesDone = BOOKS.filter(
    (book) => progress.countIn(book.chapters) === book.chapters.length
  ).length;

  const alsoReading = BOOKS.filter((book) => {
    const read = progress.countIn(book.chapters);
    return read > 0 && read < book.chapters.length && book.id !== next?.bookId;
  });

  const nextBook = next ? getBook(next.bookId) : null;

  return (
    <div className="page">
      <header className="main-head">
        <p className="main-head__eyebrow">The Library</p>
        <h1 className="main-head__title">
          {finished ? 'Everything read' : started ? 'Welcome back' : 'Welcome'}
        </h1>
        <p className="main-head__lead">
          {finished
            ? 'All twenty-seven chapters are behind you. The shelves stay open — a second reading of the harder volumes is rarely wasted.'
            : started
              ? `About ${hoursLeft} ${hoursLeft === 1 ? 'hour' : 'hours'} of reading left, across ${unread.length} chapters.`
              : 'Thirteen volumes on web development, from the structure of a page to the practices around shipping it. Start at the beginning, or take whichever one you need.'}
        </p>
      </header>

      {/* ---- Desk and ledger, side by side on a wide screen ---------------- */}
      {!finished && (
        <div className="front">
          <section
            className="desk"
            aria-label="Continue reading"
            // The book's own colour, carried through from the shelf so the
            // card is recognisably the volume you left open.
            style={{ '--spine': nextBook?.spine }}
          >
            <p className="desk__label">
              <Icon name="bookmark" />
              {started ? 'You were reading' : 'Begin here'}
            </p>

            <a className="desk__card" href={href.lesson(next.slug)}>
              <span className="desk__book">{next.bookTitle}</span>
              <span className="desk__chapter">{next.title}</span>
              <span className="desk__meta">
                {next.level} · {next.minutes} min read
              </span>
              <span className="desk__go">
                Continue
                <Icon name="arrowRight" />
              </span>
            </a>

            {upNext.length > 0 && (
              <div className="desk__queue">
                <p className="desk__queue-label">Then</p>
                <ol className="desk__queue-list">
                  {upNext.map((chapter) => (
                    <li key={chapter.slug}>
                      <a href={href.lesson(chapter.slug)}>
                        <span className="desk__queue-title">{chapter.title}</span>
                        <span className="desk__queue-meta">
                          {chapter.bookTitle} · {chapter.minutes} min
                        </span>
                      </a>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          {started && (
            <aside className="ledger" aria-label="Your progress">
              <p className="ledger__label">Progress</p>

              <dl className="ledger__figures">
                <div>
                  <dt>Chapters</dt>
                  <dd>
                    {progress.total} <span>of {TOTAL_CHAPTERS}</span>
                  </dd>
                </div>
                <div>
                  <dt>Volumes</dt>
                  <dd>
                    {volumesDone} <span>of {TOTAL_BOOKS}</span>
                  </dd>
                </div>
                <div>
                  <dt>Left to read</dt>
                  <dd>
                    {minutesLeft} <span>min</span>
                  </dd>
                </div>
              </dl>

              <div
                className="ledger__bar"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress.percent}
                aria-label="Chapters read"
              >
                <div className="ledger__fill" style={{ width: `${progress.percent}%` }} />
              </div>
              <p className="ledger__percent">{progress.percent}% read</p>

              {alsoReading.length > 0 && (
                <div className="ledger__also">
                  <p className="ledger__also-label">Also part-read</p>
                  {alsoReading.map((book) => (
                    <a key={book.id} className="ledger__also-link" href={href.book(book.id)}>
                      <span
                        className="ledger__also-spine"
                        style={{ background: book.spine }}
                        aria-hidden="true"
                      />
                      {book.title}
                      <span className="ledger__also-count">
                        {progress.countIn(book.chapters)}/{book.chapters.length}
                      </span>
                    </a>
                  ))}
                </div>
              )}
            </aside>
          )}
        </div>
      )}

      {/* ---- The subjects --------------------------------------------------- */}
      <section aria-label="Subjects">
        <h2 className="main-section__title">On the shelves</h2>

        <ul className="subject-list">
          {SUBJECTS.map((subject) => {
            const chapters = subject.books.flatMap((book) => book.chapters);
            const read = progress.countIn(chapters);
            const minutes = subject.books.reduce((sum, book) => sum + bookMinutes(book), 0);

            return (
              <li key={subject.id}>
                <a className="subject-card" href={href.subject(subject.id)}>
                  {/* A miniature of the actual shelf: same colours, same
                      thickness-from-chapter-count, same height variation. It
                      is a preview of a real thing rather than a decoration
                      that happens to be near it. */}
                  <span className="subject-card__shelf" aria-hidden="true">
                    <span className="subject-card__spines">
                      {subject.books.map((book) => (
                        <span
                          key={book.id}
                          className="subject-card__spine"
                          style={{
                            background: book.spine,
                            height: `${72 + hash(book.title) * 28}%`,
                            width: `${Math.min(11, 5 + book.chapters.length * 1.6)}px`,
                          }}
                        />
                      ))}
                    </span>
                    <span className="subject-card__board" />
                  </span>

                  <span className="subject-card__body">
                    <span className="subject-card__title">{subject.title}</span>
                    <span className="subject-card__tagline">{subject.tagline}</span>

                    <span className="subject-card__meta">
                      <span>
                        <strong>{subject.books.length}</strong> volumes
                      </span>
                      <span>
                        <strong>{chapters.length}</strong> chapters
                      </span>
                      <span>
                        <strong>{Math.round(minutes / 60)}</strong> hours
                      </span>
                      {read > 0 && (
                        <span className="subject-card__read">
                          <strong>{read}</strong> read
                        </span>
                      )}
                    </span>
                  </span>

                  <Icon name="chevronRight" className="icon subject-card__arrow" />
                </a>
              </li>
            );
          })}
        </ul>
      </section>

      <p className="main-foot">
        Every chapter is hand-written and explained, with exercises at the end and examples you
        can run without leaving the page. Around {Math.round(TOTAL_MINUTES / 60)} hours in all.
      </p>
    </div>
  );
}
