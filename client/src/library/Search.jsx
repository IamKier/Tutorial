// ============================================================================
// Search — FINDING THINGS ACROSS EVERY LESSON
// ============================================================================
//
// Searching titles alone is nearly useless in a library: you remember a phrase
// from the middle of a lesson, not its heading. So this searches the full text
// of all fifteen.
//
// It builds the index lazily — nothing is fetched until you actually open
// search for the first time. Twenty thousand words is small enough to hold in
// memory and scan on every keystroke, so there is no need for anything
// cleverer. If the library grew ten times, the answer would be to build an
// index at compile time rather than to optimise this loop.
// ============================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { LESSONS } from '../content/catalogue.js';
import { href } from '../hooks/useRouter.js';
import { Icon } from '../components/Icon.jsx';

/** Strip HTML to plain text, so a search for "flex" does not match a class name. */
function toPlainText(html) {
  // Using the browser's own parser rather than a regex. HTML is not a regular
  // language and every hand-rolled tag-stripper eventually mangles something.
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();
}

/** A few words either side of the match, so a result is worth reading. */
function snippet(text, query) {
  const at = text.toLowerCase().indexOf(query);
  if (at === -1) return text.slice(0, 120);

  const start = Math.max(0, at - 50);
  const end = Math.min(text.length, at + query.length + 90);

  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

export function Search({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(null); // null = not built yet
  const inputRef = useRef(null);

  // ---- Build the index, once, the first time search is opened -------------
  useEffect(() => {
    if (!open || index) return;

    let cancelled = false;

    // All fifteen at once rather than one after another: fifteen requests in
    // sequence would take fifteen round trips instead of one.
    Promise.all(
      LESSONS.map(async (lesson) => {
        const response = await fetch(`/lessons/${lesson.slug}.html`);
        const html = await response.text();
        return { ...lesson, text: toPlainText(html) };
      })
    )
      .then((entries) => {
        if (!cancelled) setIndex(entries);
      })
      .catch(() => {
        // A failed index means search falls back to titles only, which is
        // still better than an error message.
        if (!cancelled) setIndex([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open, index]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
    else setQuery('');
  }, [open]);

  // ---- Run the search -----------------------------------------------------
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (needle.length < 2) return [];

    const source = index ?? LESSONS.map((lesson) => ({ ...lesson, text: '' }));

    return source
      .map((lesson) => {
        const inTitle = lesson.title.toLowerCase().includes(needle);
        const inTopic = lesson.topicTitle.toLowerCase().includes(needle);
        const bodyAt = lesson.text.toLowerCase().indexOf(needle);

        if (!inTitle && !inTopic && bodyAt === -1) return null;

        return {
          ...lesson,
          // A title match is almost always what you meant, so it outranks a
          // body match no matter how many times the word appears in the text.
          score: inTitle ? 0 : inTopic ? 1 : 2,
          preview: bodyAt !== -1 ? snippet(lesson.text, needle) : lesson.topicTitle,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8);
  }, [query, index]);

  if (!open) return null;

  return (
    // Clicking the dark backdrop closes. The check makes sure a click inside
    // the panel does not count as one on the backdrop.
    <div
      className="search-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="search-panel" role="dialog" aria-modal="true" aria-label="Search lessons">
        <div className="search-field">
          <Icon name="search" />
          <input
            ref={inputRef}
            type="search"
            className="search-field__input"
            placeholder="Search every lesson…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') onClose();
              // Enter opens the first result, so you can type three letters
              // and go without reaching for the mouse.
              if (event.key === 'Enter' && results[0]) {
                location.hash = href.lesson(results[0].slug);
                onClose();
              }
            }}
          />
          <kbd>Esc</kbd>
        </div>

        <div className="search-results">
          {query.trim().length < 2 && (
            <p className="search-hint">
              {index ? 'Type at least two characters.' : 'Building the index…'}
            </p>
          )}

          {query.trim().length >= 2 && results.length === 0 && (
            <p className="search-hint">Nothing matches “{query}”.</p>
          )}

          {results.map((result) => (
            <a
              key={result.slug}
              className="search-result"
              href={href.lesson(result.slug)}
              onClick={onClose}
            >
              <span className="search-result__topic">{result.topicTitle}</span>
              <span className="search-result__title">{result.title}</span>
              <span className="search-result__preview">{result.preview}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
