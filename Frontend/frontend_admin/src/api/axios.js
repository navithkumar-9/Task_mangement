import axios from 'axios';

const API = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
});

let cachedToken = null;

// Retrieve access token from memory cache or fallback to localStorage
const getAccessToken = () => {
    if (cachedToken) return cachedToken;
    try {
        const tokens = JSON.parse(localStorage.getItem('admin_tokens'));
        cachedToken = tokens?.access || null;
    } catch (e) {
        cachedToken = null;
    }
    return cachedToken;
};

// Invalidate token cache when storage changes in another window/tab
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key === 'admin_tokens') {
            cachedToken = null;
        }
    });
}

API.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
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

            try {
                const tokens = JSON.parse(localStorage.getItem('admin_tokens'));
                if (tokens?.refresh) {
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
                            'admin_tokens',
                            JSON.stringify(newTokens),
                        );
                        cachedToken = res.data.access; // Cache the new token

                        API.defaults.headers.common['Authorization'] =
                            `Bearer ${res.data.access}`;
                        originalRequest.headers.Authorization = `Bearer ${res.data.access}`;

                        processQueue(null, res.data.access);
                        return API(originalRequest);
                    }
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                localStorage.removeItem('admin_tokens');
                localStorage.removeItem('admin_user');
                cachedToken = null; // Clear token cache
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }

            localStorage.removeItem('admin_tokens');
            localStorage.removeItem('admin_user');
            cachedToken = null; // Clear token cache
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

export default API;
