import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL;

if (!BASE_URL && import.meta.env.PROD) {
  console.error('[api] VITE_API_URL is not set. API calls will fail in production.');
}

// Issue #26: Use env variable for API URL so it works in both dev and production
const api = axios.create({
  baseURL: BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (typeof config.headers?.delete === 'function') {
      config.headers.delete('Content-Type');
    } else {
      delete config.headers['Content-Type'];
    }
  }

  return config;
});

// Guard against HTML error pages returned when VITE_API_URL is misconfigured
api.interceptors.response.use(
  (response) => {
    const contentType = response.headers['content-type'] || '';
    if (!contentType.includes('application/json') && typeof response.data === 'string' && response.data.startsWith('<')) {
      return Promise.reject(new Error('API returned an HTML page. Check that VITE_API_URL is correctly set.'));
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Only redirect if not already on auth pages to avoid redirect loops
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/signup')) {
        window.location.replace('/login');
      }
    }
    if (!error.response && error.request) {
      error.message = BASE_URL
        ? `Could not reach the booking server at ${BASE_URL}. Check the backend deployment and CORS settings.`
        : 'The production API URL is not configured. Set VITE_API_URL in the frontend deployment.';
    }
    return Promise.reject(error);
  }
);

export default api;
