// Wrapper Fetch API centralisé (cf. §3.3 /core/api.js)
// Gère le JWT en mémoire + rafraîchissement automatique via cookie HttpOnly.

const BASE = '/api';
let accessToken = sessionStorage.getItem('tsundoku_at') || null;

export function setToken(token) {
  accessToken = token;
  if (token) sessionStorage.setItem('tsundoku_at', token);
  else sessionStorage.removeItem('tsundoku_at');
}
export function getToken() { return accessToken; }

async function request(path, { method = 'GET', body, auth = false, retry = true } = {}) {
  const headers = {};
  if (body !== undefined && !(body instanceof FormData)) headers['Content-Type'] = 'application/json';
  if (auth && accessToken) headers.Authorization = `Bearer ${accessToken}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    credentials: 'include',
    body: body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Tente un refresh une fois si l'access token a expiré
  if (res.status === 401 && auth && retry) {
    const refreshed = await tryRefresh();
    if (refreshed) return request(path, { method, body, auth, retry: false });
  }

  const isJson = (res.headers.get('content-type') || '').includes('application/json');
  const data = isJson ? await res.json() : await res.text();
  if (!res.ok) {
    const err = new Error((data && data.error) || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

async function tryRefresh() {
  try {
    const res = await fetch(`${BASE}/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (!res.ok) return false;
    const data = await res.json();
    setToken(data.accessToken);
    return true;
  } catch { return false; }
}

export const api = {
  get: (p, opts) => request(p, { ...opts, method: 'GET' }),
  post: (p, body, opts) => request(p, { ...opts, method: 'POST', body }),
  put: (p, body, opts) => request(p, { ...opts, method: 'PUT', body }),
  patch: (p, body, opts) => request(p, { ...opts, method: 'PATCH', body }),
  del: (p, opts) => request(p, { ...opts, method: 'DELETE' }),
  // Raccourcis authentifiés
  auth: {
    get: (p) => request(p, { method: 'GET', auth: true }),
    post: (p, body) => request(p, { method: 'POST', body, auth: true }),
    put: (p, body) => request(p, { method: 'PUT', body, auth: true }),
    patch: (p, body) => request(p, { method: 'PATCH', body, auth: true }),
    del: (p) => request(p, { method: 'DELETE', auth: true }),
  },
  tryRefresh,
};
