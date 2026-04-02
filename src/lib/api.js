const normalizeBaseUrl = (value = '') => {
  const cleaned = String(value)
    .replace(/%20/gi, '')
    .trim()
    .replace(/^['"`\s]+|['"`\s]+$/g, '')
    .replace(/\s+/g, '');
  return cleaned.replace(/\/+$/, '');
};

const validateAbsoluteBaseUrl = (value = '') => {
  const normalized = normalizeBaseUrl(value);
  if (!normalized) return '';
  try {
    const parsed = new URL(normalized);
    if (/[%\s]/.test(parsed.host)) return '';
    return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, '');
  } catch {
    return '';
  }
};

export const API_BASE_URL = validateAbsoluteBaseUrl(import.meta.env.VITE_API_BASE_URL || '');
export const ML_API_URL = normalizeBaseUrl(import.meta.env.VITE_ML_API_URL || '/ml-api');

export const NGROK_SKIP_HEADER = { 'ngrok-skip-browser-warning': '69420' };

export function apiUrl(path) {
  if (!path) return API_BASE_URL || '/';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  if (!API_BASE_URL) return normalizedPath;
  return `${API_BASE_URL}${normalizedPath}`;
}

export function getHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    ...NGROK_SKIP_HEADER
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
