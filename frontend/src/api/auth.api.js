import { api } from './axios.js';

export const register = (data) => api.post('/auth/register', data).then((r) => r.data.user);
export const login = (data) => api.post('/auth/login', data).then((r) => r.data.user);
export const logout = () => api.post('/auth/logout');
export const me = () => api.get('/auth/me').then((r) => r.data.user);
export const updateProfile = (data) => api.patch('/auth/me', data).then((r) => r.data.user);
export const changePassword = (data) => api.patch('/auth/password', data);
export const getConfig = () => api.get('/config').then((r) => r.data);
