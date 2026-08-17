// ============================================================================
// api.js — TALKING TO THE SERVER
// ============================================================================
//
// Unchanged in spirit from the version before React: components never call
// fetch directly, they call these functions. React changes how the screen is
// drawn, not how the network works.
// ============================================================================

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request(url, { method = 'GET', body } = {}) {
  const options = { method, headers: {} };

  if (body !== undefined) {
    // The server needs this to parse the body — and it is also half of the
    // CSRF defence, since an HTML form cannot produce this content type.
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(url, options);
  } catch {
    // fetch rejects ONLY when the request never completed: server down,
    // offline, DNS failure. Every HTTP error arrives as a successful fetch,
    // which is the trap below.
    throw new ApiError(0, 'Cannot reach the server. Is it still running?');
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = await response.json();
      if (data.error) message = data.error;
    } catch {
      /* not JSON — the status message will do */
    }
    throw new ApiError(response.status, message);
  }

  if (response.status === 204) return null;
  return response.json();
}

export const auth = {
  me: () => request('/api/auth/me'),
  login: (email, password) =>
    request('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email, password) =>
    request('/api/auth/register', { method: 'POST', body: { email, password } }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
};

export const tasks = {
  list: () => request('/api/tasks'),

  create: (title, dueAt = null) =>
    request('/api/tasks', { method: 'POST', body: { title, dueAt } }),

  update: (id, changes) =>
    request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'PATCH', body: changes }),

  // Returns { deleted: task } — the whole task, so undo can restore it with
  // its original id rather than creating a lookalike.
  remove: (id) => request(`/api/tasks/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  undo: (task) =>
    request(`/api/tasks/${encodeURIComponent(task.id)}/undo`, {
      method: 'POST',
      body: { task },
    }),

  clearCompleted: () => request('/api/tasks', { method: 'DELETE' }),
};
