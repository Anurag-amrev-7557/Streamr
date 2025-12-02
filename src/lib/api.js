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

        // Handle 401 errors - redirect to login if needed, but let the store handle state clearing
        if (error.response?.status === 401) {
            console.log('Authentication required');
        }

        return Promise.reject(error);
    }
);

export default api;
