// ============================================================================
// boot.js — RUNS BEFORE ANYTHING ELSE
// ============================================================================
//
// Two jobs, both of which have to happen before the page is painted.
//
// This is a plain classic script, not a module, and it is loaded with a
// RELATIVE path. Both details are deliberate:
//
//   - A `type="module"` script is deferred until the document is parsed, which
//     is too late to set the theme without a visible flash.
//   - A relative path still resolves when the file is opened directly from
//     disk, which is exactly the situation the second job below detects.
//
// It also used to be an inline <script>. It was moved out here so the
// Content-Security-Policy can be `script-src 'self'` with no 'unsafe-inline' —
// see src/security.js.
// ============================================================================

(function () {
  // ---- 1. Apply the saved theme, before the first paint --------------------
  // Done here rather than in the app's main script because anything later
  // means the browser paints the light version first and then switches: a
  // white flash on every load for anyone who chose dark.
  try {
    var savedTheme = localStorage.getItem('theme');
    if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  } catch (err) {
    // localStorage throws in private browsing on some browsers. A missing
    // theme preference is not worth breaking the page over.
  }

  // ---- 2. Catch the file:// mistake ----------------------------------------
  // Every path in the HTML is absolute — "/theme.css", "/js/app.js". Under
  // http://localhost:3000 those resolve against the server. Opened by
  // double-clicking the file, the browser uses the file:// protocol where "/"
  // means the root of the DISK, so it looks for C:/theme.css, finds nothing,
  // and renders an unstyled page with no error to explain why.
  if (location.protocol === 'file:') {
    document.addEventListener('DOMContentLoaded', function () {
      var warning = document.createElement('div');

      // Inline styles, because the stylesheet is precisely what failed to load.
      warning.style.cssText =
        'margin:1rem;padding:1rem 1.25rem;border-radius:12px;' +
        'background:#fdeceb;border-left:4px solid #d92d20;color:#14171c;' +
        'font-family:system-ui,sans-serif;font-size:15px;line-height:1.55';

      warning.innerHTML =
        '<strong>Opened as a file, not through the server.</strong><br />' +
        'Styles and data cannot load this way. Run <code>node server.js</code> in ' +
        'the Tutorial folder, then open ' +
        '<a href="http://localhost:3000/">http://localhost:3000/</a>';

      document.body.prepend(warning);
    });
  }
})();
