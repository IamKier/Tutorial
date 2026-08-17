// ============================================================================
// useTheme — LIGHT AND DARK
// ============================================================================
//
// The stylesheet does all the actual work: theme.css redefines its colour
// tokens under `[data-theme="dark"]`. All this hook does is set an attribute
// on <html> and remember the choice.
//
// Note what it does NOT do: no component reads a colour from here. Style stays
// in the stylesheet, and this only flips the switch.
// ============================================================================

import { useCallback } from 'react';

export function useTheme() {
  return useCallback(() => {
    // What is on screen may come from the operating system setting rather than
    // a saved choice, so ask the browser what it is actually painting instead
    // of assuming a starting point.
    const current =
      document.documentElement.dataset.theme ||
      (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    const next = current === 'dark' ? 'light' : 'dark';

    document.documentElement.dataset.theme = next;

    try {
      localStorage.setItem('theme', next);
    } catch {
      /* private browsing */
    }
  }, []);
}
