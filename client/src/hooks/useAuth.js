// ============================================================================
// useAuth — WHO IS SIGNED IN
// ============================================================================
//
// A custom hook is just a function whose name starts with `use` and that calls
// other hooks. That is the whole rule. It exists so a piece of stateful logic
// can be reused, and so components stay about what is on screen rather than
// how it got there.
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { auth } from '../api.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  // Starts true: on first render we genuinely do not know yet, and rendering
  // the login form during that moment would flash it at someone who is
  // already signed in.
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // The session lives in an HttpOnly cookie, which JavaScript cannot read by
    // design. So the only way to know whether we are signed in is to ask the
    // server. That is a feature: an XSS hole cannot steal a cookie it cannot
    // see.
    let cancelled = false;

    auth
      .me()
      .then(({ user }) => {
        if (!cancelled) setUser(user);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    // Cleanup. If this component unmounts before the request finishes, calling
    // setState on it would be pointless work at best. React's StrictMode runs
    // effects twice in development specifically to catch the version of this
    // code that forgets to clean up.
    return () => {
      cancelled = true;
    };
  }, []); // [] means "run once, after the first render"

  // useCallback keeps the same function identity between renders, so a child
  // receiving it as a prop is not re-rendered just because its parent was.
  const signIn = useCallback(async (email, password) => {
    const { user } = await auth.login(email, password);
    setUser(user);
  }, []);

  const signUp = useCallback(async (email, password) => {
    const { user } = await auth.register(email, password);
    setUser(user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await auth.logout();
    } finally {
      // Clear the user even if the request failed. Staying "signed in" on
      // screen after someone asked to leave is worse than a lost request.
      setUser(null);
    }
  }, []);

  return { user, loading, signIn, signUp, signOut };
}
