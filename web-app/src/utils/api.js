const API = 'http://127.0.0.1:8000/api';

export function getToken() {
  return localStorage.getItem('farm_token');
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API}${path}`, { ...options, headers });
    
    if (res.status === 401) {
      localStorage.removeItem('farm_token');
      localStorage.removeItem('farm_user');
      window.location.hash = '#login';
      return null;
    }
    
    // Check if response is JSON
    const contentType = res.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await res.text();
      console.error('Non-JSON response:', text.substring(0, 200));
      throw new Error('Server returned non-JSON response. Check if Laravel server is running.');
    }
    
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Request failed');
    return data;
  } catch (error) {
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Cannot connect to server. Please check if Laravel backend is running on port 8000.');
    }
    throw error;
  }
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
