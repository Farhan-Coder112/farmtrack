/* api.js — Centralized API client */
const API = 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('farm_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (res.status === 401) {
    localStorage.removeItem('farm_token');
    localStorage.removeItem('farm_user');
    showAuthScreen();
    return null;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
  return data;
}

function apiGet(path) {
  return apiFetch(path, { method: 'GET' });
}
function apiPost(path, body) {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}
function apiPut(path, body) {
  return apiFetch(path, { method: 'PUT', body: JSON.stringify(body) });
}
function apiDelete(path) {
  return apiFetch(path, { method: 'DELETE' });
}
