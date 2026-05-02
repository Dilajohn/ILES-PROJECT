import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

const client = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach JWT access token to every request
client.interceptors.request.use(
  config => {
    const token = localStorage.getItem('iles_access_token');
    if (token) config.headers['Authorization'] = `Bearer ${token}`;
    return config;
  },
  e => Promise.reject(e)
);

// Auto-refresh on 401 — redirect to landing page (not /login) on failure
client.interceptors.response.use(
  r => r,
  async e => {
    const orig = e.config;
    if (e.response?.status === 401 && !orig._retry) {
      orig._retry = true;
      try {
        const refresh = localStorage.getItem('iles_refresh_token');
        const { data } = await axios.post(`${BASE_URL}/auth/token/refresh/`, { refresh });
        localStorage.setItem('iles_access_token', data.access);
        orig.headers['Authorization'] = `Bearer ${data.access}`;
        return client(orig);
      } catch {
        localStorage.removeItem('iles_access_token');
        localStorage.removeItem('iles_refresh_token');
        localStorage.removeItem('iles_session_user');
        window.location.href = '/';   // ← fixed: landing page, not /login
      }
    }
    return Promise.reject(e);
  }
);

export default client;
