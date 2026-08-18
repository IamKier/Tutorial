// ============================================================================
// useProgress — WHAT YOU HAVE READ
// ============================================================================
//
// Kept in localStorage, so it survives closing the browser but stays on this
// device. No account, no server, nothing to sign into.
//
// The trade is worth stating: clear your browser data and progress goes with
// it. For a personal study library that is an acceptable price for having no
// login at all.
// ============================================================================

import { useState, useCallback, useEffect } from 'react';
import { TOTAL_LESSONS } from '../content/catalogue.js';

const KEY = 'library-progress';

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    // A Set answers "have I read this?" instantly and cannot hold duplicates.
    // localStorage only holds strings, so we convert at the boundary in both
    // directions.
    return new Set(Array.isArray(saved) ? saved : []);
  } catch {
    // Corrupt or hand-edited data should not break the library. Start fresh.
    return new Set();
  }
}

export function useProgress() {
  const [done, setDone] = useState(load);

  // Save whenever it changes, rather than in every function that changes it.
  // One place to get right instead of four.
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify([...done]));
    } catch {
      /* private browsing — not worth breaking over */
    }
  }, [done]);

  const toggle = useCallback((slug) => {
    setDone((current) => {
      // A new Set, not a mutated one. React compares by identity, so mutating
      // the existing Set would change the data and re-render nothing.
      const next = new Set(current);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const isDone = useCallback((slug) => done.has(slug), [done]);

  const reset = useCallback(() => setDone(new Set()), []);

  /** How many of a given list of lessons are finished. */
  const countIn = useCallback(
    (lessons) => lessons.filter((lesson) => done.has(lesson.slug)).length,
    [done]
  );

  return {
    done,
    isDone,
    toggle,
    reset,
    countIn,
    total: done.size,
    percent: Math.round((done.size / TOTAL_LESSONS) * 100),
  };
}
