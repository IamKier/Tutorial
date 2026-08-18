// ============================================================================
// Contents — THE SHELVES
// ============================================================================
//
// The table of contents: every topic, in reading order, with how far through
// each one you are. This is where the cover sends you.
// ============================================================================

import { TOPICS, TOTAL_LESSONS, TOTAL_MINUTES, LESSONS, roman } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function Contents({ progress }) {
  // Where to send someone who has started but not finished: the first lesson
  // they have not marked as read, in reading order.
  const nextLesson = LESSONS.find((lesson) => !progress.isDone(lesson.slug));
  const started = progress.total > 0;

  return (
    <div className="page">
      {/*
        Deliberately spare. The cover has already made the pitch — repeating
        the same headline, the same paragraph and the same three statistics one
        click later gives the reader nothing and delays the thing they came
        for, which is the list.
      */}
      <header className="contents-head">
        <p className="contents-head__eyebrow">Contents</p>
        <div className="contents-head__meta">
          <span>
            {TOPICS.length} parts · {TOTAL_LESSONS} lessons ·{' '}
            {Math.round(TOTAL_MINUTES / 60)} hours
          </span>
          {started && (
            <a className="contents-head__resume" href={href.lesson(nextLesson?.slug ?? 'welcome')}>
              Resume at {nextLesson?.title ?? 'the beginning'}
              <Icon name="arrowRight" />
            </a>
          )}
        </div>
      </header>

      {/* The shelves. A grid that reflows by itself: each column is at least
          16rem and shares whatever is left over, so the column count changes
          with the window and there is not a single media query involved. */}
      <section className="shelves" aria-label="Topics">
        {TOPICS.map((topic, topicIndex) => {
          const readCount = progress.countIn(topic.lessons);
          const complete = readCount === topic.lessons.length;
          const minutes = topic.lessons.reduce(
            (sum, lesson) => sum + Math.max(1, Math.round(lesson.words / 200)),
            0
          );

          return (
            <a
              key={topic.id}
              className={`shelf${complete ? ' is-complete' : ''}`}
              href={href.topic(topic.id)}
            >
              {/* A chapter numeral, as a printed volume would set it. The
                  first topic is the preface, so it gets no number. */}
              <span className="shelf__numeral">
                {topicIndex === 0 ? '—' : roman(topicIndex)}
              </span>

              <h2 className="shelf__title">{topic.title}</h2>
              <p className="shelf__tagline">{topic.tagline}</p>

              <div className="shelf__foot">
                <span className="shelf__count">
                  {topic.lessons.length} {topic.lessons.length === 1 ? 'lesson' : 'lessons'} ·{' '}
                  {minutes} min
                </span>

                {readCount > 0 && (
                  <span className="shelf__badge">
                    {complete ? 'Read' : `${readCount}/${topic.lessons.length}`}
                  </span>
                )}
              </div>

              {/* A hairline along the bottom edge rather than a number: at a
                  glance you want to see how far along you are, not read a
                  fraction. */}
              <div className="shelf__bar">
                <div
                  className="shelf__bar-fill"
                  style={{ width: `${(readCount / topic.lessons.length) * 100}%` }}
                />
              </div>
            </a>
          );
        })}
      </section>

      <section className="callout-card">
        <h2>The example project</h2>
        <p>
          The later lessons dissect a real task app — the same one running at{' '}
          <a href={href.demo()}>the demo</a>. Reading code that already works, and that you
          can break and fix, teaches more than any example written to be read.
        </p>
        <a className="button" href={href.demo()}>
          Open the demo
          <Icon name="arrowRight" />
        </a>
      </section>
    </div>
  );
}
