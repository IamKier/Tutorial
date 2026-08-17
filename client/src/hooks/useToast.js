// ============================================================================
// useToast — THE MESSAGE AT THE BOTTOM OF THE SCREEN
// ============================================================================
//
// Used for errors and for undo. One component, because two that look identical
// will drift apart.
// ============================================================================

import { useState, useRef, useCallback, useEffect } from 'react';

export function useToast() {
  const [toast, setToast] = useState(null);

  // useRef holds a value across renders WITHOUT causing one when it changes.
  // A timer id is exactly that: the screen does not depend on it, so putting
  // it in state would trigger pointless re-renders.
  const timer = useRef(null);

  const hide = useCallback(() => {
    clearTimeout(timer.current);
    setToast(null);
  }, []);

  const show = useCallback((message, options = {}) => {
    const { tone = 'error', action = null, duration = 5000 } = options;

    // Cancel any timer already running, or a second toast inherits the first
    // one's countdown and vanishes early.
    clearTimeout(timer.current);

    setToast({ message, tone, action });
    timer.current = setTimeout(() => setToast(null), duration);
  }, []);

  // If this unmounts while a timer is pending, the callback would fire against
  // a component that no longer exists. Clearing it on cleanup is the habit
  // that prevents a whole family of subtle bugs.
  useEffect(() => () => clearTimeout(timer.current), []);

  return { toast, show, hide };
}
