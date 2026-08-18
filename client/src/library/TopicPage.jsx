// ============================================================================
// TopicPage — ONE SHELF, UP CLOSE
// ============================================================================

import { getTopic } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function TopicPage({ topicId, progress }) {
  const topic = getTopic(topicId);

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
        <span className="topic-head__icon">
          <Icon name={topic.icon} />
        </span>
        <div>
          <h1 className="topic-head__title">{topic.title}</h1>
          <p className="topic-head__tagline">{topic.tagline}</p>
        </div>
      </header>

      <p className="topic-head__meta">
        {readCount} of {topic.lessons.length} read
      </p>

      <ol className="lesson-list">
        {topic.lessons.map((lesson, index) => {
          const isDone = progress.isDone(lesson.slug);
          const minutes = Math.max(1, Math.round(lesson.words / 200));

          return (
            <li key={lesson.slug}>
              <a className={`lesson-row${isDone ? ' is-done' : ''}`} href={href.lesson(lesson.slug)}>
                <span className="lesson-row__number">{isDone ? <Icon name="check" /> : index + 1}</span>

                <span className="lesson-row__body">
                  <span className="lesson-row__title">{lesson.title}</span>
                  <span className="lesson-row__meta">
                    {lesson.level} · {minutes} min read
                  </span>
                </span>

                <Icon name="arrowRight" className="icon lesson-row__arrow" />
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
