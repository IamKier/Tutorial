// ============================================================================
// Cover — THE TITLE PAGE
// ============================================================================
//
// What you land on. A book opens with a title page rather than with chapter
// one, and the reasons carry over: it says what this is, who it is for, and
// how long it will take, before asking you to commit to anything.
//
// It is one click to get past, and the click is the point. Arriving somewhere
// deliberately is different from being dropped into the middle of it.
//
// For a returning reader the page changes its offer: the main action becomes
// "continue reading" and goes to the first unread lesson, so the cover is a
// way back in rather than an obstacle.
// ============================================================================

import { TOPICS, TOTAL_LESSONS, TOTAL_MINUTES, LESSONS } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';

export function Cover({ progress }) {
  const nextLesson = LESSONS.find((lesson) => !progress.isDone(lesson.slug));
  const started = progress.total > 0;
  const finished = !nextLesson;

  const hours = Math.round(TOTAL_MINUTES / 60);

  return (
    <div className="cover">
      <div className="cover__plate">
        <p className="cover__eyebrow">A study library</p>

        <h1 className="cover__title">
          Fullstack
          <span className="cover__title-line">Development</span>
        </h1>

        {/* A printer's ornament, the way a title page divides itself from the
            matter beneath. Decorative, so it is hidden from screen readers —
            announcing "asterisk asterisk asterisk" helps nobody. */}
        <p className="cover__ornament" aria-hidden="true">
          ❧
        </p>

        <p className="cover__lead">
          From a blank HTML file to a working application — the page, the server, and the
          database beneath it. Everything hand-written and explained, with exercises at the
          end of each lesson.
        </p>

        {/* Set like the publication details on a title page verso. */}
        <dl className="cover__details">
          <div>
            <dt>Lessons</dt>
            <dd>{TOTAL_LESSONS}</dd>
          </div>
          <div>
            <dt>Parts</dt>
            <dd>{TOPICS.length}</dd>
          </div>
          <div>
            <dt>Reading time</dt>
            <dd>{hours} hours</dd>
          </div>
        </dl>

        <div className="cover__actions">
          {finished ? (
            <a className="button button--primary" href={href.contents()}>
              Browse the contents
            </a>
          ) : (
            <a className="button button--primary" href={href.lesson(nextLesson.slug)}>
              {started ? 'Continue reading' : 'Begin reading'}
            </a>
          )}

          {!finished && (
            <a className="cover__secondary" href={href.contents()}>
              or browse the contents
            </a>
          )}
        </div>

        {started && (
          <p className="cover__progress">
            {finished
              ? `All ${TOTAL_LESSONS} lessons read.`
              : `${progress.total} of ${TOTAL_LESSONS} read · next up, ${nextLesson.title}`}
          </p>
        )}
      </div>

      {/* A colophon: the note at the back of a book saying how it was made.
          Here it doubles as a statement of what the reader is about to get. */}
      <footer className="cover__colophon">
        <p>
          No frameworks in the examples, no copying without understanding. The library ships
          with the application its later lessons take apart.
        </p>
      </footer>
    </div>
  );
}
