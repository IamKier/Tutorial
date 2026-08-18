// ============================================================================
// SubjectsPage — THE CATALOGUE
// ============================================================================
//
// The floor of the library: which subjects are held here. One today; the shape
// takes more without any change beyond an entry in catalogue.js.
// ============================================================================

import { SUBJECTS, TOTAL_BOOKS, TOTAL_CHAPTERS, bookMinutes } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

export function SubjectsPage({ progress }) {
  return (
    <div className="page">
      <header className="contents-head">
        <p className="contents-head__eyebrow">Subjects</p>
        <div className="contents-head__meta">
          <span>
            {SUBJECTS.length} {SUBJECTS.length === 1 ? 'subject' : 'subjects'} · {TOTAL_BOOKS}{' '}
            volumes · {TOTAL_CHAPTERS} chapters
          </span>
        </div>
      </header>

      <ul className="subject-list">
        {SUBJECTS.map((subject) => {
          const chapters = subject.books.flatMap((book) => book.chapters);
          const read = progress.countIn(chapters);
          const minutes = subject.books.reduce((sum, book) => sum + bookMinutes(book), 0);

          return (
            <li key={subject.id}>
              <a className="subject-card" href={href.subject(subject.id)}>
                {/* The spines of the volumes inside, as a preview of the
                    shelf. Decorative — the titles are all on the next page —
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

      <p className="subject-list__note">
        Each subject holds a set of volumes, and each volume a few chapters. Everything is
        written to be read in order, though nothing stops you pulling one off the shelf.
      </p>
    </div>
  );
}
