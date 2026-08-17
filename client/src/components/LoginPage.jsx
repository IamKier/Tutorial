// ============================================================================
// LoginPage — SIGN IN AND REGISTER
// ============================================================================
//
// One component, two modes. `mode` is the only state that matters, and
// everything visible is derived from it — which is the React way of saying
// what the old version said by toggling classes.
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { ApiError } from '../api.js';

export function LoginPage({ onSignIn, onSignUp }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const emailRef = useRef(null);
  const registering = mode === 'register';

  // Focus the first field on load, and again whenever the mode changes.
  useEffect(() => {
    emailRef.current?.focus();
  }, [mode]);

  async function handleSubmit(event) {
    // Without this the browser navigates and reloads the page, and the request
    // below never runs. React does not change that — it is still a form.
    event.preventDefault();
    setError(null);

    // A quick check before spending a round trip. The server validates
    // properly; this only makes the common mistake fast to correct.
    if (!email.trim() || !password) {
      setError('Email and password are both required');
      return;
    }

    if (registering && password.length < 10) {
      setError('Password must be at least 10 characters');
      return;
    }

    setBusy(true);

    try {
      if (registering) await onSignUp(email.trim(), password);
      else await onSignIn(email.trim(), password);
      // On success the app re-renders with a user, and this component is gone.
      // Nothing to do here — no navigation, no cleanup.
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Try again.');
      setBusy(false);
      setPassword('');
    }
  }

  return (
    <div className="auth-shell">
      <main className="auth">
        <header className="auth__head">
          <span className="auth__mark" aria-hidden="true">
            ✓
          </span>
          <h1 className="auth__title">Tasks</h1>
          <p className="auth__subtitle">
            {registering ? 'Create an account' : 'Sign in to your list'}
          </p>
        </header>

        {/* role="tablist" tells a screen reader this is a choice between two
            panels, not two unrelated buttons that happen to sit together. */}
        <div className="auth__tabs" role="tablist" aria-label="Sign in or register">
          <button
            className={`auth__tab${registering ? '' : ' is-active'}`}
            type="button"
            role="tab"
            aria-selected={!registering}
            onClick={() => {
              setMode('login');
              setError(null);
            }}
          >
            Sign in
          </button>
          <button
            className={`auth__tab${registering ? ' is-active' : ''}`}
            type="button"
            role="tab"
            aria-selected={registering}
            onClick={() => {
              setMode('register');
              setError(null);
            }}
          >
            Create account
          </button>
        </div>

        <form className="auth__form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label className="field__label" htmlFor="email">
              Email
            </label>
            {/*
              A controlled input: its value comes from state, and every
              keystroke goes through onChange. That one-way flow is why the
              value on screen can never disagree with the value in state.
            */}
            <input
              className="field__input"
              id="email"
              ref={emailRef}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="password">
              Password
            </label>
            <input
              className="field__input"
              id="password"
              type="password"
              // Tells a password manager whether to offer a saved password or
              // generate a new one. Getting this wrong is why some sites fight
              // your password manager on every visit.
              autoComplete={registering ? 'new-password' : 'current-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
            {registering && <p className="field__hint">At least 10 characters.</p>}
          </div>

          {/* role="alert" makes a screen reader announce this the moment it
              appears, rather than leaving it to be discovered. */}
          {error && (
            <p className="auth__error" role="alert">
              {error}
            </p>
          )}

          <button className="auth__submit" type="submit" disabled={busy}>
            {busy
              ? registering
                ? 'Creating account…'
                : 'Signing in…'
              : registering
                ? 'Create account'
                : 'Sign in'}
          </button>
        </form>

        <p className="auth__note">
          Your tasks are private to your account. This runs on your own server — no data
          leaves it.
        </p>
      </main>
    </div>
  );
}
