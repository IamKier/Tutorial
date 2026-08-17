// ============================================================================
// App — WHICH SCREEN ARE WE ON
// ============================================================================
//
// There is no router here, deliberately. The app has exactly two screens and
// which one you see is decided entirely by whether you are signed in — that is
// a condition, not a URL. Adding react-router would mean another dependency
// and a second source of truth about the same question.
//
// Add one when you have routes people should be able to bookmark and share.
// ============================================================================

import { useAuth } from './hooks/useAuth.js';
import { LoginPage } from './components/LoginPage.jsx';
import { TasksPage } from './components/TasksPage.jsx';

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  // On the first render we genuinely do not know yet. Rendering the login form
  // during that moment would flash it at someone who is already signed in.
  if (loading) {
    return (
      <div className="splash" role="status" aria-label="Loading">
        <span className="splash__mark" aria-hidden="true">
          ✓
        </span>
      </div>
    );
  }

  return user ? (
    <TasksPage user={user} onSignOut={signOut} />
  ) : (
    <LoginPage onSignIn={signIn} onSignUp={signUp} />
  );
}
