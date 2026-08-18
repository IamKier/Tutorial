// ============================================================================
// TopicPage — ONE SHELF, UP CLOSE
// ============================================================================

import { getTopic, TOPICS, roman } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function TopicPage({ topicId, progress }) {
  const topic = getTopic(topicId);
  const index = TOPICS.findIndex((t) => t.id === topicId);

  if (!topic) {
    return (
      <div className="page">
        <h1>Topic not found</h1>
        <p className="lead">
          That link does not match a topic. <a href={href.home()}>Back to the library</a>.
        </p>
      </div>
    );
  }

  const readCount = progress.countIn(topic.lessons);

  return (
    <div className="page">
      {/* A breadcrumb, so you always know where you are and how to get back
          out. Two levels deep is where people start feeling lost without one. */}
      <nav className="crumbs" aria-label="Breadcrumb">
        <a href={href.home()}>Library</a>
        <Icon name="chevronRight" />
        <span aria-current="page">{topic.title}</span>
      </nav>

      <header className="topic-head">
        <span className="topic-head__numeral">
          {index === 0 ? 'Preface' : `Part ${roman(index)}`}
        </span>
        <h1 className="topic-head__title">{topic.title}</h1>
        <p className="topic-head__tagline">{topic.tagline}</p>
      </header>

      <p className="topic-head__meta">
        {readCount} of {topic.lessons.length} read
      </p>

      {/* Set as a table of contents: number, title, dotted leader, reading
          time. The leader is what makes it read as a contents page rather
          than a list of links. */}
      <ol className="lesson-list">
        {topic.lessons.map((lesson, lessonIndex) => {
          const isDone = progress.isDone(lesson.slug);
          const minutes = Math.max(1, Math.round(lesson.words / 200));

          return (
            <li key={lesson.slug}>
              <a className={`lesson-row${isDone ? ' is-done' : ''}`} href={href.lesson(lesson.slug)}>
                <span className="lesson-row__number">{isDone ? '✓' : lessonIndex + 1}</span>
                <span className="lesson-row__title">{lesson.title}</span>
                {/* Purely decorative, so it is hidden from screen readers. */}
                <span className="lesson-row__leader" aria-hidden="true" />
                <span className="lesson-row__meta">
                  {lesson.level} · {minutes} min
                </span>
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
