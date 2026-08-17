// ============================================================================
// router.js — MATCHING A REQUEST TO A HANDLER
// ============================================================================
//
// "Routing" sounds grand. It is: look at the method and the path, decide which
// function runs. This is a small version of what Express's router does, and
// having written one you will never find its behaviour mysterious.
//
//     const router = createRouter();
//     router.get('/api/tasks', listHandler);
//     router.patch('/api/tasks/:id', updateHandler);
//
//     const match = router.match('PATCH', '/api/tasks/abc-123');
//     // -> { handler: updateHandler, params: { id: 'abc-123' } }
// ============================================================================

export function createRouter() {
  const routes = [];

  function add(method, pattern, handler) {
    routes.push({
      method,
      // '/api/tasks/:id' -> ['api', 'tasks', ':id']
      // filter(Boolean) drops the empty strings the slashes create.
      segments: pattern.split('/').filter(Boolean),
      handler,
    });
  }

  return {
    get: (pattern, handler) => add('GET', pattern, handler),
    post: (pattern, handler) => add('POST', pattern, handler),
    patch: (pattern, handler) => add('PATCH', pattern, handler),
    put: (pattern, handler) => add('PUT', pattern, handler),
    delete: (pattern, handler) => add('DELETE', pattern, handler),

    /**
     * Find the handler for a method and path.
     *
     * Returns { handler, params } on a match, or null.
     */
    match(method, pathname) {
      const parts = pathname.split('/').filter(Boolean);

      for (const route of routes) {
        if (route.method !== method) continue;
        if (route.segments.length !== parts.length) continue;

        const params = {};
        let matched = true;

        for (let i = 0; i < parts.length; i++) {
          const segment = route.segments[i];

          if (segment.startsWith(':')) {
            // A path segment arrives percent-encoded, so an id containing a
            // space or a slash reaches us as %20 or %2F. Decoding here means
            // handlers always see the real value.
            params[segment.slice(1)] = decodeURIComponent(parts[i]);
          } else if (segment !== parts[i]) {
            matched = false;
            break;
          }
        }

        if (matched) return { handler: route.handler, params };
      }

      return null;
    },

    /**
     * Which methods does this path accept?
     *
     * Used to answer 405 Method Not Allowed properly. Returning a 404 for
     * `DELETE /api/tasks` when `GET /api/tasks` exists is misleading — it
     * says the path is wrong when only the verb is.
     */
    allowedMethods(pathname) {
      const parts = pathname.split('/').filter(Boolean);
      const methods = new Set();

      for (const route of routes) {
        if (route.segments.length !== parts.length) continue;

        const matched = route.segments.every(
          (segment, i) => segment.startsWith(':') || segment === parts[i]
        );

        if (matched) methods.add(route.method);
      }

      return [...methods];
    },
  };
}
