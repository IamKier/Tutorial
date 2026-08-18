// ============================================================================
// useRouter — WHICH PAGE ARE WE ON
// ============================================================================
//
// A library has real pages: a home page, a topic, a lesson. Each should be
// bookmarkable and shareable, and the back button should work. That is what a
// router is for, and it is why this app has one now when the single-screen
// task app did not.
//
// This is about forty lines instead of a dependency. It uses the hash — the
// part after # — because the server never sees it, so every route works
// without any server configuration at all:
//
//     #/                    the cover
//     #/subjects            the catalogue of subjects
//     #/subject/web-…      one subject's shelf of books
//     #/book/css            one book's chapters
//     #/lesson/css-basics   one chapter
//     #/demo                the example app
//
// react-router does much more than this (nested routes, loaders, transitions).
// Reach for it when you need those; forty lines is cheaper until then.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/** Turn "#/lesson/css-basics" into { name: 'lesson', param: 'css-basics' }. */
function parse(hash) {
  const path = hash.replace(/^#\/?/, '');
  if (!path) return { name: 'home', param: null };

  const [name, param] = path.split('/');

  if (name === 'lesson' && param) return { name: 'lesson', param };
  if (name === 'book' && param) return { name: 'book', param };
  if (name === 'subject' && param) return { name: 'subject', param };
  if (name === 'subjects') return { name: 'subjects', param: null };
  if (name === 'demo') return { name: 'demo', param: null };

  return { name: 'home', param: null };
}

export function useRouter() {
  const [route, setRoute] = useState(() => parse(location.hash));

  useEffect(() => {
    // `hashchange` fires for every navigation including the back button, so
    // listening for it is the whole router. No history manipulation needed.
    const onChange = () => setRoute(parse(location.hash));

    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  // Scroll to the top when the page changes. Without this you arrive at a new
  // lesson already halfway down it, which is disorienting every single time.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [route.name, route.param]);

  const navigate = useCallback((to) => {
    location.hash = to;
  }, []);

  return { route, navigate };
}

/** Build the href for a route, so links are written in one style everywhere. */
export const href = {
  home: () => '#/',
  subjects: () => '#/subjects',
  subject: (id) => `#/subject/${id}`,
  book: (id) => `#/book/${id}`,
  lesson: (slug) => `#/lesson/${slug}`,
  demo: () => '#/demo',
};
