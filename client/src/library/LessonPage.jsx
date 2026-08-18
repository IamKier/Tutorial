// ============================================================================
// LessonPage — THE READER
// ============================================================================
//
// Fetches a lesson, inserts it, enhances it, and wraps it in what a reader
// needs: an outline, a way to mark it read, and links to what comes next.
// ============================================================================

import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { getChapter, CHAPTERS, chapterIndex, TOTAL_CHAPTERS } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { enhance } from './enhance.js';
import { Icon } from '../components/Icon.jsx';
import { Outline } from './Outline.jsx';

export function LessonPage({ slug, progress }) {
  const lesson = getChapter(slug);
  const index = chapterIndex(slug);

  const [html, setHtml] = useState(null);
  const [error, setError] = useState(null);
  const [headings, setHeadings] = useState([]);

  const articleRef = useRef(null);

  // ---- Fetch the lesson ---------------------------------------------------
  useEffect(() => {
    if (!lesson) return;

    let cancelled = false;
    setHtml(null);
    setError(null);

    fetch(`/lessons/${slug}.html`)
      .then((response) => {
        // fetch does not reject on a 404 — it only rejects when the request
        // never completed. Checking response.ok is not optional.
        if (!response.ok) throw new Error(`Could not load this lesson (${response.status})`);
        return response.text();
      })
      .then((text) => {
        if (!cancelled) setHtml(text);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });

    // If the reader navigates away mid-request, do not set state on a
    // component that is no longer on the page.
    return () => {
      cancelled = true;
    };
  }, [slug, lesson]);

  // ---- Insert the lesson, then enhance it ---------------------------------
  //
  // The markup is written in here by hand rather than with
  // dangerouslySetInnerHTML, and that is the important detail.
  //
  // With dangerouslySetInnerHTML, React owns this element's children. It
  // re-applies that HTML whenever the component re-renders — and enhance()
  // calls setHeadings, which causes exactly that. The result was that every
  // Run button, every highlighted token and every heading id was created and
  // then immediately wiped, with no error to show for it.
  //
  // Setting innerHTML ourselves on an element React renders empty means React
  // has no children to reconcile here, so it never touches this subtree again.
  // The rule: React owns the container, we own the contents. Pick one.
  //
  // useLayoutEffect rather than useEffect because this runs before the browser
  // paints — otherwise there is a visible frame of raw, unstyled markup.
  useLayoutEffect(() => {
    const article = articleRef.current;
    if (!html || !article) return;

    // Safe because this content comes from files in this repository, not from
    // anything a visitor typed. That distinction is the whole rule — never do
    // this with input you did not write yourself.
    article.innerHTML = html;

    setHeadings(enhance(article));
  }, [html]);

  if (!lesson) {
    return (
      <div className="page">
        <h1>Chapter not found</h1>
        <p className="lead">
          That link does not match a chapter. <a href={href.subjects()}>Back to the catalogue</a>.
        </p>
      </div>
    );
  }

  const previous = CHAPTERS[index - 1];
  const next = CHAPTERS[index + 1];
  const isDone = progress.isDone(slug);

  return (
    <div className="reader">
      <div className="reader__main">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href={href.subjects()}>Library</a>
          <Icon name="chevronRight" />
          <a href={href.subject(lesson.subjectId)}>{lesson.subjectTitle}</a>
          <Icon name="chevronRight" />
          <a href={href.book(lesson.bookId)}>{lesson.bookTitle}</a>
          <Icon name="chevronRight" />
          <span aria-current="page">{lesson.title}</span>
        </nav>

        <p className="reader__eyebrow">
          Chapter {index + 1} of {TOTAL_CHAPTERS} · {lesson.level} · {lesson.minutes} min read
        </p>

        {error && (
          <div className="callout callout--warn" role="alert">
            <span className="callout__title">Could not load the lesson</span>
            <p>{error}</p>
          </div>
        )}

        {/* Skeleton lines while it loads, shaped like text so the page does not
            jump when the real content arrives. */}
        {!html && !error && (
          <div className="lesson-skeleton" aria-hidden="true">
            <div className="lesson-skeleton__line lesson-skeleton__line--title" />
            <div className="lesson-skeleton__line" />
            <div className="lesson-skeleton__line" />
            <div className="lesson-skeleton__line lesson-skeleton__line--short" />
          </div>
        )}

        {/* Rendered empty on purpose. The layout effect above fills it in and
            then enhances it; React must not manage what is inside. */}
        {html && <article className="prose" ref={articleRef} />}

        {html && (
          <button
            className={`done-toggle${isDone ? ' is-done' : ''}`}
            type="button"
            aria-pressed={isDone}
            onClick={() => progress.toggle(slug)}
          >
            {isDone && <Icon name="check" />}
            {isDone ? 'Marked as read' : 'Mark as read'}
          </button>
        )}

        <nav className="lesson-nav" aria-label="Lesson navigation">
          {/* An empty span keeps "Next" pushed to the right when there is no
              "Previous" — simpler than conditionally changing the layout. */}
          {previous ? (
            <a className="lesson-nav__link" href={href.lesson(previous.slug)} rel="prev">
              <Icon name="chevronLeft" />
              <span className="lesson-nav__text">
                <span className="lesson-nav__label">Previous</span>
                <span className="lesson-nav__title">{previous.title}</span>
              </span>
            </a>
          ) : (
            <span />
          )}

          {next && (
            <a
              className="lesson-nav__link lesson-nav__link--next"
              href={href.lesson(next.slug)}
              rel="next"
            >
              <span className="lesson-nav__text">
                <span className="lesson-nav__label">Next</span>
                <span className="lesson-nav__title">{next.title}</span>
              </span>
              <Icon name="chevronRight" />
            </a>
          )}
        </nav>
      </div>

      {/* The outline rail. CSS hides it below the width where it would start
          squeezing the text column. */}
      <Outline headings={headings} />
    </div>
  );
}
