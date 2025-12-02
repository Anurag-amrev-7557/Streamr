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
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Request interceptor to attach the authentication token to headers.
 * Retrieves 'auth_token' from localStorage.
 */
api.interceptors.request.use(
    /**
     * @param {InternalAxiosRequestConfig} config
     * @returns {InternalAxiosRequestConfig}
     */
    (config) => {
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    /**
     * @param {any} error
     * @returns {Promise<never>}
     */
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * Response interceptor to handle global error responses.
 * Specifically handles 401 Unauthorized errors by clearing the token.
 */
api.interceptors.response.use(
    /**
     * @param {AxiosResponse} response
     * @returns {AxiosResponse}
     */
    (response) => response,
    /**
     * @param {AxiosError} error
     * @returns {Promise<never>}
     */
    (error) => {
        // Suppress expected 401 errors from /auth/me (when user is not logged in)
        if (error.config?.url?.includes('/auth/me') && error.response?.status === 401) {
            // This is expected when user is not authenticated, don't log it
            return Promise.reject(error);
        }

        // Handle 401 errors - clear token and redirect to login
        if (error.response?.status === 401) {
            localStorage.removeItem('auth_token');
            console.log('Authentication required');
        }

        return Promise.reject(error);
    }
);

export default api;
