// ============================================================================
// App — THE SHELL AND THE ROUTER
// ============================================================================
//
// Decides which page is showing, and wraps all of them in the header that
// stays put: the library link, search, progress and the theme switch.
// ============================================================================

import { useState, useEffect } from 'react';
import { useRouter, href } from './hooks/useRouter.js';
import { useProgress } from './hooks/useProgress.js';
import { useTheme } from './hooks/useTheme.js';
import { TOTAL_CHAPTERS } from './content/catalogue.js';
import { Cover } from './library/Cover.jsx';
import { SubjectsPage } from './library/SubjectsPage.jsx';
import { SubjectPage } from './library/SubjectPage.jsx';
import { BookPage } from './library/BookPage.jsx';
import { LessonPage } from './library/LessonPage.jsx';
import { Search } from './library/Search.jsx';
import { TasksPage } from './components/TasksPage.jsx';
import { Icon } from './components/Icon.jsx';

export default function App() {
  const { route } = useRouter();
  const progress = useProgress();
  const toggleTheme = useTheme();
  const [searchOpen, setSearchOpen] = useState(false);

  // Ctrl+K opens search — the shortcut every documentation site uses, so it is
  // the one people try first. "/" too, which is the other common convention.
  useEffect(() => {
    function onKeyDown(event) {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      if ((event.key === 'k' && (event.metaKey || event.ctrlKey)) || (event.key === '/' && !typing)) {
        event.preventDefault();
        setSearchOpen(true);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <>
      <header className="topbar">
        <a className="topbar__brand" href={href.home()}>
          <span className="topbar__mark" aria-hidden="true">
            {'</>'}
          </span>
          <span className="topbar__name">Fullstack Library</span>
        </a>

        <div className="topbar__actions">
          <button
            className="topbar__search"
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search lessons"
          >
            <Icon name="search" />
            <span className="topbar__search-label">Search</span>
            <kbd>Ctrl K</kbd>
          </button>

          {progress.total > 0 && (
            <span className="topbar__progress" title={`${progress.percent}% read`}>
              {progress.total}/{TOTAL_CHAPTERS}
            </span>
          )}

          <button
            className="icon-button"
            type="button"
            onClick={toggleTheme}
            aria-label="Switch theme"
          >
            <Icon name="sun" className="icon icon--sun" />
            <Icon name="moon" className="icon icon--moon" />
          </button>
        </div>
      </header>

      <main className="shell">
        {route.name === 'home' && <Cover progress={progress} />}
        {route.name === 'subjects' && <SubjectsPage progress={progress} />}
        {route.name === 'subject' && <SubjectPage subjectId={route.param} progress={progress} />}
        {route.name === 'book' && <BookPage bookId={route.param} progress={progress} />}
        {route.name === 'lesson' && <LessonPage slug={route.param} progress={progress} />}
        {route.name === 'demo' && <TasksPage />}
      </main>

      <Search open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
