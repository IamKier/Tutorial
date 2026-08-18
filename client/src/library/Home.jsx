// ============================================================================
// Home — THE SHELVES
// ============================================================================
//
// The front of the library. Its job is to answer three questions in the first
// few seconds: what is in here, where do I start, and where was I.
// ============================================================================

import { TOPICS, TOTAL_LESSONS, TOTAL_MINUTES, LESSONS } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function Home({ progress }) {
  // Where to send someone who has started but not finished: the first lesson
  // they have not marked as read, in reading order.
  const nextLesson = LESSONS.find((lesson) => !progress.isDone(lesson.slug));
  const started = progress.total > 0;

  return (
    <div className="page">
      <header className="hero">
        <p className="hero__eyebrow">A study library</p>
        <h1 className="hero__title">Learn fullstack development</h1>
        <p className="hero__lead">
          Fifteen lessons taking you from a blank HTML file to a working application —
          frontend, backend and database. Everything is hand-written and explained, with
          exercises at the end of each lesson.
        </p>

        <div className="hero__meta">
          <span>
            <strong>{TOTAL_LESSONS}</strong> lessons
          </span>
          <span>
            <strong>{Math.round(TOTAL_MINUTES / 60)}</strong> hours of reading
          </span>
          <span>
            <strong>{TOPICS.length}</strong> topics
          </span>
        </div>

        <div className="hero__actions">
          <a className="button button--primary" href={href.lesson(nextLesson?.slug ?? 'welcome')}>
            {started ? 'Continue' : 'Start reading'}
            <Icon name="arrowRight" />
          </a>

          {started && (
            <span className="hero__progress">
              {progress.total} of {TOTAL_LESSONS} read · {progress.percent}%
            </span>
          )}
        </div>
      </header>

      {/* The shelves. A grid that reflows by itself: each column is at least
          16rem and shares whatever is left over, so the column count changes
          with the window and there is not a single media query involved. */}
      <section className="shelves" aria-label="Topics">
        {TOPICS.map((topic) => {
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
              <span className="shelf__icon">
                <Icon name={topic.icon} />
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
                    {complete ? <Icon name="check" /> : `${readCount}/${topic.lessons.length}`}
                  </span>
                )}
              </div>

              {/* A thin bar rather than a number: at a glance you want to see
                  how far along you are, not read a fraction. */}
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
