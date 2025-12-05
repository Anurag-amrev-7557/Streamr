import axios from 'axios';
import { getBaseUrl } from '../utils/apiConfig';

/**
 * @typedef {import('axios').AxiosInstance} AxiosInstance
 * @typedef {import('axios').InternalAxiosRequestConfig} InternalAxiosRequestConfig
 * @typedef {import('axios').AxiosError} AxiosError
 * @typedef {import('axios').AxiosResponse} AxiosResponse
 */

/**
 * Axios instance for backend API requests.
 * Base URL is set from environment variable or defaults to localhost.
 * Includes credentials (cookies) for authentication.
 * 
 * @type {AxiosInstance}
 */
const api = axios.create({
    baseURL: getBaseUrl(),
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor to attach Authorization header with token from localStorage.
 * This is needed for cross-origin requests in production where third-party cookies may be blocked.
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

/**
 * Response interceptor to handle global error responses.
 * Also extracts and stores tokens from successful auth responses.
 */
api.interceptors.response.use(
    (response) => {
        // Store token from auth responses
        if (response.data?.token) {
            localStorage.setItem('auth_token', response.data.token);
        }
        return response;
    },
    (error) => {
        // Clear token on 401 errors (except for /auth/me which is expected when not logged in)
        if (error.response?.status === 401) {
            if (!error.config?.url?.includes('/auth/me')) {
                localStorage.removeItem('auth_token');
                console.log('Authentication required');
            }
            // Otherwise suppress - this is expected when user is not logged in
        }
        return Promise.reject(error);
    }
);

export default api;
