// ============================================================================
// LessonPage — THE READER
// ============================================================================
//
// Fetches a lesson, inserts it, enhances it, and wraps it in what a reader
// needs: an outline, a way to mark it read, and links to what comes next.
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { getLesson, LESSONS, lessonIndex, TOTAL_LESSONS } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { enhance } from './enhance.js';
import { Icon } from '../components/Icon.jsx';
import { Outline } from './Outline.jsx';

export function LessonPage({ slug, progress }) {
  const lesson = getLesson(slug);
  const index = lessonIndex(slug);

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

  // ---- Enhance it once it is on the page ----------------------------------
  useEffect(() => {
    if (!html || !articleRef.current) return;
    // This runs after React has committed the markup below, so the elements
    // exist by the time it touches them.
    setHeadings(enhance(articleRef.current));
  }, [html]);

  if (!lesson) {
    return (
      <div className="page">
        <h1>Lesson not found</h1>
        <p className="lead">
          That link does not match a lesson. <a href={href.home()}>Back to the library</a>.
        </p>
      </div>
    );
  }

  const previous = LESSONS[index - 1];
  const next = LESSONS[index + 1];
  const isDone = progress.isDone(slug);

  return (
    <div className="reader">
      <div className="reader__main">
        <nav className="crumbs" aria-label="Breadcrumb">
          <a href={href.home()}>Library</a>
          <Icon name="chevronRight" />
          <a href={href.topic(lesson.topicId)}>{lesson.topicTitle}</a>
          <Icon name="chevronRight" />
          <span aria-current="page">{lesson.title}</span>
        </nav>

        <p className="reader__eyebrow">
          Lesson {index + 1} of {TOTAL_LESSONS} · {lesson.level} · {lesson.minutes} min read
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

        {/*
          dangerouslySetInnerHTML is the right call here, despite the name.

          React escapes anything you interpolate — exactly what you want for
          user input, and exactly wrong for a lesson written as HTML, which
          would show its tags as text.

          It is safe because this content comes from files in this repository,
          not from anything a visitor typed. That distinction is the whole
          rule: never use it with input you did not write yourself.
        */}
        {html && (
          <article className="prose" ref={articleRef} dangerouslySetInnerHTML={{ __html: html }} />
        )}

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
