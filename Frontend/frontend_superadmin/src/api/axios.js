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

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach((prom) => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

API.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then((token) => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return API(originalRequest);
                    })
                    .catch((err) => Promise.reject(err));
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const tokens = JSON.parse(localStorage.getItem('sa_tokens'));
            if (tokens?.refresh) {
                try {
                    const refreshUrl = `${API.defaults.baseURL.replace(/\/$/, '')}/token/refresh/`;
                    const res = await axios.post(refreshUrl, {
                        refresh: tokens.refresh,
                    });
                    if (res.data?.access) {
                        const newTokens = {
                            ...tokens,
                            access: res.data.access,
                        };
                        localStorage.setItem(
                            'sa_tokens',
                            JSON.stringify(newTokens),
                        );

                        API.defaults.headers.common['Authorization'] =
                            `Bearer ${res.data.access}`;
                        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

                        processQueue(null, res.data.access);
                        return API(originalRequest);
                    }
                } catch (refreshError) {
                    processQueue(refreshError, null);
                    localStorage.removeItem('sa_tokens');
                    localStorage.removeItem('sa_user');
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                localStorage.removeItem('sa_tokens');
                localStorage.removeItem('sa_user');
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default API;
