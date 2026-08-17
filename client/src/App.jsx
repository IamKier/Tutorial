// ============================================================================
// App — THE ROOT COMPONENT
// ============================================================================
//
// One screen, so this is barely more than a pass-through. It stays as a
// separate component anyway: main.jsx is about starting React, and this is
// about what the app *is*. Collapsing them saves four lines and loses the
// place where a second screen would go.
// ============================================================================

import { TasksPage } from './components/TasksPage.jsx';

export default function App() {
  return <TasksPage />;
}
