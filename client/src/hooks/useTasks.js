// ============================================================================
// useTasks — THE TASK LIST AND EVERYTHING YOU CAN DO TO IT
// ============================================================================
//
// All the task logic lives here, so the components are only about layout.
// That split is the point of custom hooks: TasksPage should read like a
// description of the screen, not like a description of the network.
// ============================================================================

import { useState, useEffect, useCallback, useMemo } from 'react';
import { tasks as api } from '../api.js';
import { isOverdue } from '../format.js';

const FILTER_KEY = 'task-filter';

function loadFilter() {
  try {
    const saved = localStorage.getItem(FILTER_KEY);
    return ['all', 'active', 'done'].includes(saved) ? saved : 'all';
  } catch {
    return 'all';
  }
}

export function useTasks({ onError, onDeleted }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  // A function passed to useState is called once, on the first render only.
  // Writing `useState(loadFilter())` instead would read localStorage on every
  // single render and throw the result away.
  const [filter, setFilterState] = useState(loadFilter);
  const [justAdded, setJustAdded] = useState(null);
  // Set when the API cannot be reached at all — as opposed to a request that
  // failed. On a static host there is no backend, and a toast that says
  // "cannot reach the server" over and over explains nothing. This lets the
  // page say what is actually going on.
  const [offline, setOffline] = useState(false);

  /** Every call to the server goes through this, so error handling is in one place. */
  const run = useCallback(
    async (work) => {
      try {
        return await work();
      } catch (err) {
        // status 0 means the request never completed: no server there.
        if (err.status === 0) {
          setOffline(true);
          return null;
        }
        onError(err.message);
        return null;
      }
    },
    [onError]
  );

  const reload = useCallback(async () => {
    const list = await run(() => api.list());
    if (list) setTasks(list);
    setLoading(false);
  }, [run]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Two tabs would otherwise diverge silently: add a task in one and the other
  // shows stale data forever. Re-fetching when a tab is looked at again is the
  // cheapest fix that actually works.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload();
    };

    document.addEventListener('visibilitychange', onVisible);
    // Removing the listener on unmount is not optional — without it, every
    // mount adds another and they all keep firing.
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [reload]);

  const setFilter = useCallback((next) => {
    setFilterState(next);
    try {
      localStorage.setItem(FILTER_KEY, next);
    } catch {
      /* private browsing — not worth breaking over */
    }
  }, []);

  // ---- Operations ---------------------------------------------------------

  const add = useCallback(
    async (title, dueAt) => {
      const task = await run(() => api.create(title, dueAt));
      if (!task) return false;

      // Store the task the SERVER returned, not the values we typed — its copy
      // has the real id and timestamps. When client and server disagree about
      // what was saved, the server is right.
      setTasks((current) => [task, ...current]);
      setJustAdded(task.id);
      return true;
    },
    [run]
  );

  const toggle = useCallback(
    async (id) => {
      const task = tasks.find((t) => t.id === id);
      if (!task) return;

      const updated = await run(() => api.update(id, { done: !task.done }));
      if (!updated) return reload();

      // A new array, not a mutated one. React compares by identity, so pushing
      // into the existing array would change the data without re-rendering
      // anything — the single most common React bug.
      setTasks((current) => current.map((t) => (t.id === id ? updated : t)));
    },
    [tasks, run, reload]
  );

  const rename = useCallback(
    async (id, title) => {
      const trimmed = title.trim();
      const task = tasks.find((t) => t.id === id);

      // Nothing to do if unchanged, and an empty title is a cancel rather than
      // an error — the server would reject it anyway.
      if (!trimmed || !task || trimmed === task.title) return;

      const updated = await run(() => api.update(id, { title: trimmed }));
      if (!updated) return;

      setTasks((current) => current.map((t) => (t.id === id ? updated : t)));
    },
    [tasks, run]
  );

  const remove = useCallback(
    async (id) => {
      const result = await run(() => api.remove(id));
      if (!result) return reload();

      setTasks((current) => current.filter((t) => t.id !== id));
      // Hand the deleted task back up so the page can offer Undo.
      onDeleted(result.deleted);
    },
    [run, reload, onDeleted]
  );

  const undo = useCallback(
    async (task) => {
      const restored = await run(() => api.undo(task));
      if (!restored) return;

      // Put it back where it belongs rather than at the top: it keeps its
      // original createdAt, so sorting by that returns it to its old place.
      setTasks((current) =>
        [...current, restored].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      );
      setJustAdded(restored.id);
    },
    [run]
  );

  const clearCompleted = useCallback(async () => {
    const result = await run(() => api.clearCompleted());
    if (!result) return reload();

    setTasks((current) => current.filter((t) => !t.done));
    return result.deleted;
  }, [run, reload]);

  // ---- Derived values -----------------------------------------------------
  //
  // Calculated on every render rather than stored. Storing a count means
  // keeping two things in step, and one day they disagree.
  //
  // useMemo skips the recalculation when nothing it depends on changed. With a
  // dozen tasks that is unnecessary; it is here because with ten thousand it
  // would not be, and the shape of the code is the same either way.

  const visible = useMemo(() => {
    if (filter === 'active') return tasks.filter((t) => !t.done);
    if (filter === 'done') return tasks.filter((t) => t.done);
    return tasks;
  }, [tasks, filter]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;

    return {
      total,
      done,
      active: total - done,
      // Guard the divide: 0/0 is NaN, and NaN spreads through everything it
      // touches until it appears on screen as "NaN%".
      percent: total === 0 ? 0 : Math.round((done / total) * 100),
      overdue: tasks.filter((t) => !t.done && isOverdue(t.dueAt)).length,
    };
  }, [tasks]);

  return {
    tasks,
    visible,
    stats,
    loading,
    offline,
    filter,
    setFilter,
    justAdded,
    add,
    toggle,
    rename,
    remove,
    undo,
    clearCompleted,
  };
}
