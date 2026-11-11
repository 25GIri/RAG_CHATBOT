import axios from 'axios';

export const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({ baseURL: BASE_URL, withCredentials: true });

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const url = err.config?.url || '';
    if (err.response?.status === 401 && !url.startsWith('/auth/')) window.dispatchEvent(new Event('auth:expired'));
    return Promise.reject(err);
  }
);

export const errorMessage = (err, fallback = 'Something went wrong. Please try again.') =>
  err?.response?.data?.error?.message || (err?.code === 'ERR_NETWORK' ? 'Cannot reach the server.' : err?.message) || fallback;
