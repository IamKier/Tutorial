// ============================================================================
// SubjectPage — THE SHELF
// ============================================================================
//
// One subject's volumes, stood up on a shelf. Each book is a card shaped like
// a cover, with a darker spine down its left edge and its volume number at the
// foot — near enough to a real book that you know what you are looking at,
// without pretending to be a photograph of one.
// ============================================================================

import { getSubject } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';
import { Bookshelf } from './Bookshelf.jsx';

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

      <Bookshelf books={subject.books} progress={progress} />
    </div>
  );
}
