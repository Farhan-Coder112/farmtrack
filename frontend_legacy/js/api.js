/* api.js — Centralized API client */
const API = 'http://127.0.0.1:8000/api';

function getToken() {
  return localStorage.getItem('farm_token');
}

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${path}`, { ...options, headers });
    
    if (res.status === 401) {
      localStorage.removeItem('farm_token');
      localStorage.removeItem('farm_user');
      showAuthScreen();
      return null;
    }
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error('Server error: Backend returned HTML instead of JSON. Check if Laravel is running.');
    }
    
    const data = await res.json();
    if (data.traceback) {
      console.error("SERVER TRACEBACK:", data.traceback);
    }
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch')) {
      throw new Error('Connection failed: Is Laravel server running on port 8000?');
    }
    throw error;
  }
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
