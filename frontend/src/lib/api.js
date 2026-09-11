import axios from 'axios';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

// Add token to requests if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 errors - don't redirect, let components handle auth state
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401 && !error.config._retry && !error.config.url?.includes('/auth/me')) {
      error.config._retry = true;
      try {
        const { data } = await axios.post(`${API_URL}/api/auth/refresh`, {}, { withCredentials: true });
        if (data.token) {
          localStorage.setItem('token', data.token);
          error.config.headers.Authorization = `Bearer ${data.token}`;
          return api(error.config);
        }
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    return Promise.reject(error);
  }
);

export function formatApiError(detail) {
  if (detail == null || detail === '') return '';
  const cleanMsg = (str) => String(str).replace(/^Value error,\s*/i, '').trim();
  if (typeof detail === 'string') {
    const cleaned = cleanMsg(detail);
    if (cleaned.toLowerCase() === 'internal server error') {
      return 'Server error (500). The backend encountered an error. Please verify the backend is running the latest update.';
    }
    return cleaned;
  }
  if (Array.isArray(detail)) return detail.map(e => cleanMsg(e?.msg || JSON.stringify(e))).filter(Boolean).join('; ');
  if (detail?.msg) return cleanMsg(detail.msg);
  return cleanMsg(String(detail));
}

export default api;
