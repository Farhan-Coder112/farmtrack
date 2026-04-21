const API = 'http://localhost:5000/api';

export function getToken() {
  return localStorage.getItem('farm_token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    window.location.hash = '#login';
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

export function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}
export function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}
export function apiPut(path, body) {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
}
export function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}
