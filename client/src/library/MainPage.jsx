// ============================================================================
// MainPage — THE FRONT ROOM
// ============================================================================
//
// What you see on walking in. It answers, in this order:
//
//   Where was I?          — the desk, with the chapter you stopped at
//   How far have I got?   — the ledger
//   What is here?         — the subjects, and what stands on each shelf
//
// That order is deliberate. A returning reader wants the first of those and
// nothing else; a new one falls through to the third, which is where the
// library actually begins.
// ============================================================================

import {
  SUBJECTS,
  CHAPTERS,
  BOOKS,
  TOTAL_CHAPTERS,
  TOTAL_BOOKS,
  TOTAL_MINUTES,
  bookMinutes,
} from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function MainPage({ progress }) {
  const next = CHAPTERS.find((chapter) => !progress.isDone(chapter.slug));
  const started = progress.total > 0;
  const finished = !next;

  // A book counts as "in progress" only if it is begun and unfinished —
  // which is the set worth showing someone who wants to pick up where they
  // stopped.
  const inProgress = BOOKS.filter((book) => {
    const read = progress.countIn(book.chapters);
    return read > 0 && read < book.chapters.length;
  });

  const minutesLeft = CHAPTERS.filter((c) => !progress.isDone(c.slug)).reduce(
    (sum, c) => sum + c.minutes,
    0
  );

  return (
    <div className="page">
      <header className="main-head">
        <p className="main-head__eyebrow">The Library</p>
        <h1 className="main-head__title">
          {finished ? 'Everything read' : started ? 'Welcome back' : 'Welcome'}
        </h1>
        <p className="main-head__lead">
          {finished
            ? 'All eighteen chapters are behind you. The shelves stay open — a second reading of the harder volumes is rarely wasted.'
            : started
              ? `About ${Math.round(minutesLeft / 60) || 1} hour${Math.round(minutesLeft / 60) === 1 ? '' : 's'} of reading left across ${CHAPTERS.length - progress.total} chapters.`
              : 'Nine volumes on web development, written to be read in order. Start at the beginning or take whichever one you need.'}
        </p>
      </header>

      {/* ---- The desk: where you left off ---------------------------------- */}
      {!finished && (
        <section className="desk" aria-label="Continue reading">
          <div className="desk__label">
            <Icon name="bookmark" />
            {started ? 'You were reading' : 'Begin here'}
          </div>

          <a className="desk__card" href={href.lesson(next.slug)}>
            <span className="desk__book">{next.bookTitle}</span>
            <span className="desk__chapter">{next.title}</span>
            <span className="desk__meta">
              {next.level} · {next.minutes} min read
            </span>
          </a>

          {/* Other books left half-finished. Only worth showing if there are
              any, and only the ones that are not the book above. */}
          {inProgress.filter((b) => b.id !== next.bookId).length > 0 && (
            <div className="desk__also">
              <span className="desk__also-label">Also part-read</span>
              {inProgress
                .filter((b) => b.id !== next.bookId)
                .map((book) => (
                  <a key={book.id} className="desk__also-link" href={href.book(book.id)}>
                    <span className="desk__also-spine" style={{ background: book.spine }} />
                    {book.title}
                    <span className="desk__also-count">
                      {progress.countIn(book.chapters)}/{book.chapters.length}
                    </span>
                  </a>
                ))}
            </div>
          )}
        </section>
      )}

      {/* ---- The ledger: progress at a glance ------------------------------ */}
      {started && (
        <section className="ledger" aria-label="Your progress">
          <dl className="ledger__figures">
            <div>
              <dt>Chapters read</dt>
              <dd>
                {progress.total} <span>of {TOTAL_CHAPTERS}</span>
              </dd>
            </div>
            <div>
              <dt>Volumes finished</dt>
              <dd>
                {BOOKS.filter((b) => progress.countIn(b.chapters) === b.chapters.length).length}{' '}
                <span>of {TOTAL_BOOKS}</span>
              </dd>
            </div>
            <div>
              <dt>Reading left</dt>
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
        </section>
      )}

      {/* ---- The subjects -------------------------------------------------- */}
      <section aria-label="Subjects">
        <h2 className="main-section__title">
          {SUBJECTS.length === 1 ? 'On the shelves' : 'Subjects'}
        </h2>

        <ul className="subject-list">
          {SUBJECTS.map((subject) => {
            const chapters = subject.books.flatMap((book) => book.chapters);
            const read = progress.countIn(chapters);
            const minutes = subject.books.reduce((sum, book) => sum + bookMinutes(book), 0);

            return (
              <li key={subject.id}>
                <a className="subject-card" href={href.subject(subject.id)}>
                  {/* The spines of the volumes inside, as a preview of the
                      shelf. Decorative — the titles are all one click away —
                      so it is hidden from screen readers. */}
                  <span className="subject-card__spines" aria-hidden="true">
                    {subject.books.map((book) => (
                      <span
                        key={book.id}
                        className="subject-card__spine"
                        style={{ background: book.spine }}
                      />
                    ))}
                  </span>

                  <span className="subject-card__body">
                    <span className="subject-card__title">{subject.title}</span>
                    <span className="subject-card__tagline">{subject.tagline}</span>
                    <span className="subject-card__note">{subject.note}</span>

                    <span className="subject-card__meta">
                      {subject.books.length} volumes · {chapters.length} chapters · {minutes} min
                      {read > 0 && ` · ${read} read`}
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
