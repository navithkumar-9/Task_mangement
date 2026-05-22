import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

API.interceptors.request.use((config) => {
  const tokens = JSON.parse(localStorage.getItem('sa_tokens'));
  if (tokens?.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('sa_tokens');
      localStorage.removeItem('sa_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default API;
