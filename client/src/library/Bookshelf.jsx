// ============================================================================
// Bookshelf — VOLUMES STANDING ON SHELVES
// ============================================================================
//
// Books seen the way you see them on a shelf: edge-on, standing up, titles
// running down the spine.
//
// Two details do most of the work in making it read as a bookshelf rather than
// as a row of coloured rectangles:
//
//   Thickness comes from the chapter count. A book with three chapters is
//   visibly fatter than one with a single chapter, because that is what more
//   pages look like.
//
//   Height varies slightly, derived from the title so it never changes between
//   visits. A perfectly even row reads as a chart; an uneven one reads as
//   books.
//
// Spines are lovely and genuinely hard to read, so there is a list view
// alongside. The decorative default does not get to be the only option.
// ============================================================================

import { useState } from 'react';
import { bookMinutes, roman, hash } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

function BookSpine({ book, index, progress }) {
  const read = progress.countIn(book.chapters);
  const complete = read === book.chapters.length;

  // A fatter book for more chapters, within limits — one chapter should still
  // look like a book, and nine should not dominate the shelf.
  const thickness = Math.min(3.4, 1.9 + book.chapters.length * 0.42);

  // ±7% of height, and a hair of lean on some books.
  const wobble = hash(book.title);
  const height = 82 + wobble * 16;
  const lean = wobble > 0.78 ? 1.4 : 0;

  return (
    <li className="spine-slot" style={{ '--thickness': `${thickness}rem` }}>
      <a
        className={`spine${complete ? ' is-complete' : ''}`}
        href={href.book(book.id)}
        // The vertical title is decorative as far as assistive technology is
        // concerned; this is the real name of the link.
        aria-label={`${book.title} — ${book.chapters.length} chapters, ${bookMinutes(book)} minutes`}
        title={`${book.title} · ${book.tagline}`}
        style={{
          '--spine': book.spine,
          '--height': `${height}%`,
          '--lean': `${lean}deg`,
        }}
      >
        {/* Foil bands near the head and tail of the spine, the way a bound
            volume carries its title panel. Purely decorative. */}
        <span className="spine__band spine__band--top" aria-hidden="true" />

        <span className="spine__title" aria-hidden="true">
          {book.title}
        </span>

        <span className="spine__band spine__band--bottom" aria-hidden="true" />

        <span className="spine__volume" aria-hidden="true">
          {index === 0 ? '·' : roman(index)}
        </span>

        {read > 0 && <span className="spine__marker" aria-hidden="true" />}
      </a>
    </li>
  );
}

function BookRow({ book, index, progress }) {
  const read = progress.countIn(book.chapters);
  const complete = read === book.chapters.length;

  return (
    <li>
      <a
        className={`booklist-row${complete ? ' is-complete' : ''}`}
        href={href.book(book.id)}
        style={{ '--spine': book.spine }}
      >
        <span className="booklist-row__spine" aria-hidden="true" />
        <span className="booklist-row__volume">{index === 0 ? '—' : roman(index)}</span>

        <span className="booklist-row__body">
          <span className="booklist-row__title">{book.title}</span>
          <span className="booklist-row__tagline">{book.tagline}</span>
        </span>

        <span className="booklist-row__meta">
          {book.chapters.length} ch · {bookMinutes(book)} min
          {read > 0 && ` · ${complete ? 'read' : `${read}/${book.chapters.length}`}`}
        </span>

        <Icon name="chevronRight" />
      </a>
    </li>
  );
}

export function Bookshelf({ books, progress }) {
  const [view, setView] = useState('shelf');

  return (
    <div className="bookshelf">
      <div className="bookshelf__controls">
        {/* aria-pressed carries the state; the class only carries the look. */}
        <button
          className={`view-toggle${view === 'shelf' ? ' is-active' : ''}`}
          type="button"
          aria-pressed={view === 'shelf'}
          onClick={() => setView('shelf')}
        >
          Shelf
        </button>
        <button
          className={`view-toggle${view === 'list' ? ' is-active' : ''}`}
          type="button"
          aria-pressed={view === 'list'}
          onClick={() => setView('list')}
        >
          List
        </button>
      </div>

      {view === 'shelf' ? (
        <div className="shelf-unit">
          <ul className="shelf-books" aria-label="Volumes on the shelf">
            {books.map((book, index) => (
              <BookSpine key={book.id} book={book} index={index} progress={progress} />
            ))}
          </ul>

          {/* The board the books stand on. A separate element rather than a
              border, because it needs a front edge with its own thickness. */}
          <div className="shelf-board" aria-hidden="true" />

          <p className="bookshelf__hint">
            Hover a spine to read its title, or switch to the list.
          </p>
        </div>
      ) : (
        <ul className="booklist">
          {books.map((book, index) => (
            <BookRow key={book.id} book={book} index={index} progress={progress} />
          ))}
        </ul>
      )}
    </div>
  );
}
