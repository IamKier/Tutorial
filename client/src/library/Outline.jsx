// ============================================================================
// Outline — "ON THIS PAGE"
// ============================================================================
//
// The headings of the current lesson, with the one you are reading marked. On
// a long page it answers "how much is left" better than a scrollbar does.
// ============================================================================

import { useState, useEffect } from 'react';

export function Outline({ headings }) {
  const [activeId, setActiveId] = useState(null);

  useEffect(() => {
    if (headings.length === 0) return;

    // The active section is the last heading that has scrolled past the top of
    // the window, with a little slack so it activates as it arrives rather
    // than once it has already gone by.
    function update() {
      let current = headings[0]?.id ?? null;

      for (const heading of headings) {
        if (heading.element.getBoundingClientRect().top <= 120) current = heading.id;
      }

      setActiveId(current);
    }

    // Scroll events fire far faster than the screen refreshes. Coalescing them
    // with requestAnimationFrame means this runs at most once per frame, which
    // is the difference between smooth scrolling and jank.
    let queued = false;
    function onScroll() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        update();
        queued = false;
      });
    }

    update();
    // `passive` promises we will never call preventDefault, so the browser can
    // scroll without waiting to find out.
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [headings]);

  // Fewer than two sections is not an outline, it is noise.
  if (headings.length < 2) return null;

  return (
    <aside className="outline" aria-label="On this page">
      <p className="outline__title">On this page</p>
      <ul className="outline__list">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              className={`outline__link${activeId === heading.id ? ' is-active' : ''}`}
              href={`#${heading.id}`}
              onClick={(event) => {
                // A plain href would change the hash, and the router would try
                // to read it as a route. Scroll ourselves and leave the URL be.
                event.preventDefault();
                heading.element.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
