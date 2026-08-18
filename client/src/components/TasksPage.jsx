// ============================================================================
// TasksPage — THE APP
// ============================================================================
//
// This component is about layout and nothing else. Every piece of logic it
// needs comes from a hook: useTasks knows about the server, useToast knows
// about messages, useTheme knows about colours.
//
// Read it top to bottom and it describes the screen. That is the goal.
// ============================================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks.js';
import { useToast } from '../hooks/useToast.js';
import { useTheme } from '../hooks/useTheme.js';
import { todayLabel, dateInputToIso } from '../format.js';
import { Icon } from './Icon.jsx';
import { TaskItem } from './TaskItem.jsx';
import { Toast } from './Toast.jsx';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

export function TasksPage() {
  const { toast, show, hide } = useToast();
  const toggleTheme = useTheme();

  const [title, setTitle] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);

  const inputRef = useRef(null);
  const listRef = useRef(null);
  // Where to put focus after a delete. Kept in state so an effect can act on
  // it once the new list has actually rendered.
  const [focusIndex, setFocusIndex] = useState(null);

  const onError = useCallback((message) => show(message), [show]);

  const onDeleted = useCallback(
    (deleted) => {
      // Undo rather than a confirmation dialog. Confirmations train people to
      // click through them; undo keeps the common case fast and still makes a
      // mistake recoverable.
      show('Task deleted', {
        tone: 'neutral',
        duration: 8000,
        action: { label: 'Undo', onClick: () => undoRef.current(deleted) },
      });
    },
    [show]
  );

  const tasks = useTasks({ onError, onDeleted });

  // onDeleted is created before `tasks` exists, so it cannot close over
  // tasks.undo directly. A ref bridges the gap — it is read at click time, by
  // which point everything is wired up.
  const undoRef = useRef(null);
  undoRef.current = tasks.undo;

  // ---- Focus after delete ---------------------------------------------------
  // Without this, deleting with the keyboard drops focus onto <body> and you
  // have to Tab from the top of the page again.
  useEffect(() => {
    if (focusIndex === null) return;

    const buttons = listRef.current?.querySelectorAll('.task__delete') ?? [];
    const target = buttons[focusIndex] ?? buttons[buttons.length - 1];

    if (target) target.focus();
    else inputRef.current?.focus();

    setFocusIndex(null);
  }, [focusIndex, tasks.visible]);

  // ---- Keyboard shortcut ----------------------------------------------------
  useEffect(() => {
    function onKeyDown(event) {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName);

      if (event.key === 'Escape' && !typing) {
        hide();
        return;
      }

      // Ignore shortcuts while someone is typing, or "n" could not be typed
      // into the task field without the app fighting them for it.
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === 'n' || event.key === '/') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [hide]);

  // ---- Handlers -------------------------------------------------------------

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmed = title.trim();
    if (!trimmed) return;

    // Disabled while in flight, so an impatient double-click cannot create two.
    setBusy(true);
    const ok = await tasks.add(trimmed, dateInputToIso(due));
    setBusy(false);

    if (ok) {
      setTitle('');
      setDue('');
    }
    inputRef.current?.focus();
  }

  function handleDelete(id) {
    setFocusIndex(tasks.visible.findIndex((t) => t.id === id));
    tasks.remove(id);
  }

  async function handleClearDone() {
    const count = await tasks.clearCompleted();
    if (count) show(`Cleared ${count} completed`, { tone: 'neutral', duration: 3000 });
  }

  const { stats, visible, filter } = tasks;

  // On a static host — Netlify, GitHub Pages — there is no backend for the demo
  // to talk to. Saying so plainly is far better than an error toast repeating
  // "cannot reach the server", which describes the symptom and not the cause.
  if (tasks.offline) {
    return (
      <div className="page">
        <div className="callout callout--note">
          <span className="callout__title">The demo needs the local server</span>
          <p>
            The library you are reading is a static site, so it works anywhere. This
            demo is the other half of the project — a task app with a Node backend and a
            SQLite database — and there is no backend running here.
          </p>
          <p>
            To use it, clone the repository and run <code>npm run dev</code>. The lessons
            from <strong>Backend with Node</strong> onward walk through exactly how it
            works, and reading them does not require running anything.
          </p>
        </div>

        <p style={{ marginTop: 'var(--space-5)' }}>
          <a className="button button--primary" href="#/">
            Back to the library
          </a>
        </p>
      </div>
    );
  }

  return (
    <>
      <main className="app">
        <header className="masthead">
          <div className="masthead__text">
            <h1 className="masthead__title">Tasks</h1>
            <p className="masthead__date">{todayLabel()}</p>
          </div>

          <div className="masthead__actions">
            <a className="icon-button" href="/learn/" aria-label="Open the lessons">
              <Icon name="book" />
            </a>

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

        {/* Hidden until there is at least one task — "0%" on an empty list is
            noise, not information. */}
        {stats.total > 0 && (
          <section className="progress" aria-label="Progress">
            <div className="progress__meta">
              <span className="progress__label">
                {stats.done} of {stats.total} complete
              </span>
              <span className="progress__value">{stats.percent}%</span>
            </div>
            <div
              className="progress__track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={stats.percent}
            >
              <div className="progress__fill" style={{ width: `${stats.percent}%` }} />
            </div>
          </section>
        )}

        <form className="composer" onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="composer__input"
            type="text"
            placeholder="Add a task…"
            autoComplete="off"
            maxLength={200}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />

          {/* type="date" gives a real picker on every platform, and the right
              keyboard on a phone, for free. */}
          <input
            className="composer__due"
            type="date"
            aria-label="Due date (optional)"
            value={due}
            onChange={(event) => setDue(event.target.value)}
          />

          <button className="composer__submit" type="submit" disabled={busy}>
            <Icon name="plus" />
            <span className="sr-only">Add task</span>
          </button>
        </form>

        {stats.overdue > 0 && (
          <p className="overdue-note">
            {stats.overdue === 1 ? '1 task is overdue' : `${stats.overdue} tasks are overdue`}
          </p>
        )}

        <div className="toolbar">
          <div className="filters" role="group" aria-label="Filter tasks">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                className={`filter${filter === key ? ' is-active' : ''}`}
                type="button"
                aria-pressed={filter === key}
                onClick={() => tasks.setFilter(key)}
              >
                {label} <span className="filter__count">{stats[key === 'all' ? 'total' : key] || ''}</span>
              </button>
            ))}
          </div>

          {stats.done > 0 && (
            <button className="text-button" type="button" onClick={handleClearDone}>
              Clear done
            </button>
          )}
        </div>

        {tasks.loading ? (
          // Grey bars shaped like the content that is coming, rather than a
          // spinner. The layout does not jump when the real data lands.
          <div className="skeleton" aria-hidden="true">
            <div className="skeleton__row" />
            <div className="skeleton__row" />
            <div className="skeleton__row" />
          </div>
        ) : (
          <ul className="tasks" ref={listRef}>
            {visible.map((task) => (
              // `key` is how React tells one item from another between
              // renders. Using the array index instead would make React reuse
              // the wrong row when the list is filtered or reordered — the
              // classic symptom is a checkbox that ticks the wrong task.
              <TaskItem
                key={task.id}
                task={task}
                isNew={task.id === tasks.justAdded}
                onToggle={tasks.toggle}
                onRename={tasks.rename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}

        {!tasks.loading && visible.length === 0 && <EmptyState filter={filter} total={stats.total} />}

        <p className="shortcut-hint">
          Press <kbd>n</kbd> to add · click a title to rename · <kbd>Esc</kbd> to cancel
        </p>
      </main>

      <Toast toast={toast} onDismiss={hide} />
    </>
  );
}

/**
 * The message depends on WHY the list is empty. "No tasks yet" is wrong and
 * confusing when you have twelve tasks and are looking at the Done filter.
 */
function EmptyState({ filter, total }) {
  let title = 'Nothing completed yet';
  let hint = 'Tick a task off to see it here.';

  if (total === 0) {
    title = 'No tasks yet';
    hint = 'Add your first one above to get started.';
  } else if (filter === 'active') {
    title = 'All done';
    hint = 'Nothing left on your list.';
  }

  return (
    <div className="empty">
      <Icon name="clipboard" className="empty__icon" />
      <p className="empty__title">{title}</p>
      <p className="empty__hint">{hint}</p>
    </div>
  );
}
