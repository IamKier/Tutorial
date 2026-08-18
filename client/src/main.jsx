// ============================================================================
// main.jsx — WHERE REACT STARTS
// ============================================================================
//
// Vite follows the imports from this file to build the bundle, so everything
// the app uses is reachable from here — including the stylesheet, which is
// imported rather than linked so the build can process and fingerprint it.
// ============================================================================

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './styles/library.css';
import './styles/main.css';
import './styles/shelf.css';
import './styles/app.css';

// Takes over the empty <div id="root"> in index.html. Everything you see is
// rendered inside it.
//
// StrictMode is a development-only wrapper that deliberately renders each
// component twice and runs each effect twice. It looks like a bug the first
// time you notice it in the console — it is actually React checking that your
// effects clean up after themselves and that your components have no side
// effects during render. It does nothing in the production build.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
