// ============================================================================
// format.js — TURNING DATA INTO READABLE TEXT
// ============================================================================
//
// Pure functions: same input, same output, no React involved. Keeping these
// out of components is what makes them trivial to test and reuse.
// ============================================================================

/**
 * "just now", "4h ago", "3d ago", or a date.
 *
 * `Intl.RelativeTimeFormat` is built into the browser and already knows the
 * plural rules of every language — which is what hand-written versions of this
 * get wrong outside English. Reach for Intl before writing date logic.
 */
export function relativeTime(isoString) {
  const then = new Date(isoString);
  const seconds = Math.round((Date.now() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';

  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  for (const [unit, per] of [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]) {
    const value = Math.floor(seconds / per);
    if (unit === 'day' && value > 6) {
      return then.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    if (value >= 1) return formatter.format(-value, unit);
  }

  return 'just now';
}

/** "Overdue", "Today", "Tomorrow", a weekday, or a date. */
export function dueLabel(dueAt) {
  const due = new Date(dueAt);

  // Compare whole days, not instants. A task due at 09:00 today is not
  // "overdue" at 17:00 — it is due today, and saying otherwise is simply wrong
  // to the person reading it.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const days = Math.round((due - startOfToday) / 86_400_000);

  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return due.toLocaleDateString(undefined, { weekday: 'long' });

  return due.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

export function isOverdue(dueAt) {
  if (!dueAt) return false;
  return new Date(dueAt) < new Date();
}

export function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * A date input gives "2026-09-01" with no time. Parsed as-is that is midnight
 * UTC, which lands on the previous day for anyone west of London. Appending a
 * local end-of-day keeps "due Tuesday" meaning Tuesday wherever you are.
 */
export function dateInputToIso(value) {
  if (!value) return null;
  return new Date(`${value}T23:59:59`).toISOString();
}
