// ============================================================================
// TaskItem — ONE ROW
// ============================================================================
//
// Notice there is no addEventListener here, and no event delegation. React
// attaches the handlers, so the reason delegation existed in the hand-written
// version — hundreds of listeners on elements that come and go — no longer
// applies. That is a genuine thing React does for you.
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { Icon } from './Icon.jsx';
import { relativeTime, dueLabel, isOverdue } from '../format.js';

export function TaskItem({ task, isNew, onToggle, onRename, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  const overdue = !task.done && isOverdue(task.dueAt);

  // Focus and select the text as soon as the input appears, so you can just
  // start typing.
  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  function startEditing() {
    // Reset the draft from the task each time, so a cancelled edit does not
    // leave stale text behind for the next one.
    setDraft(task.title);
    setEditing(true);
  }

  function commit() {
    setEditing(false);
    onRename(task.id, draft);
  }

  function cancel() {
    setEditing(false);
    setDraft(task.title);
  }

  const className = [
    'task',
    task.done && 'is-done',
    overdue && 'is-overdue',
    isNew && 'is-new',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <li className={className}>
      {/* A real checkbox, restyled in CSS rather than replaced by a div — so
          the keyboard support and the screen reader announcement come free. */}
      <input
        type="checkbox"
        className="task__checkbox"
        checked={task.done}
        onChange={() => onToggle(task.id)}
        aria-label={`Mark "${task.title}" as done`}
      />

      <div className="task__body">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            className="task__edit"
            value={draft}
            maxLength={200}
            aria-label="Task title"
            onChange={(event) => setDraft(event.target.value)}
            // Clicking away saves, which is what people expect of an inline edit.
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commit();
              if (event.key === 'Escape') cancel();
            }}
          />
        ) : (
          <span
            className="task__title"
            // Focusable and activatable by keyboard. A control you can reach
            // with Tab but cannot use is worse than one you cannot reach.
            role="button"
            tabIndex={0}
            aria-label={`Rename "${task.title}"`}
            onClick={startEditing}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                startEditing();
              }
            }}
          >
            {/*
              React escapes anything you interpolate, so a task titled
              <img src=x onerror=alert(1)> is shown as text rather than parsed
              as markup. This is the one real security improvement React brings
              over the hand-written version — it is the safe default, and you
              have to go out of your way (dangerouslySetInnerHTML) to lose it.
            */}
            {task.title}
          </span>
        )}

        <span className="task__meta">{relativeTime(task.createdAt)}</span>
      </div>

      {task.dueAt && (
        <span
          className="task__due"
          title={new Date(task.dueAt).toLocaleDateString(undefined, { dateStyle: 'full' })}
        >
          <Icon name="calendar" />
          {dueLabel(task.dueAt)}
        </span>
      )}

      <button
        type="button"
        className="task__delete"
        aria-label={`Delete "${task.title}"`}
        onClick={() => onDelete(task.id)}
      >
        <Icon name="close" />
      </button>
    </li>
  );
}
