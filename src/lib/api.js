const trimTrailingSlash = (value = '') => value.replace(/\/+$/, '');

export const API_BASE_URL = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL || '');
export const ML_API_URL = trimTrailingSlash(import.meta.env.VITE_ML_API_URL || 'http://127.0.0.1:5000');

export const NGROK_SKIP_HEADER = { 'ngrok-skip-browser-warning': '69420' };

export function apiUrl(path) {
  if (!path) return API_BASE_URL || '/';
  return `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...NGROK_SKIP_HEADER
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
