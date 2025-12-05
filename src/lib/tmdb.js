import axios from 'axios';
import { getBaseUrl } from '../utils/apiConfig';

/**
 * @typedef {import('axios').AxiosInstance} AxiosInstance
 * @typedef {import('axios').InternalAxiosRequestConfig} InternalAxiosRequestConfig
 * @typedef {import('axios').AxiosError} AxiosError
 * @typedef {import('axios').AxiosResponse} AxiosResponse
 */

/**
 * Axios instance for The Movie Database (TMDB) API.
 * Base URL: Points to our backend proxy to avoid CORS/Network issues
 * 
 * @type {AxiosInstance}
 */
const tmdb = axios.create({
    baseURL: `${getBaseUrl()}/tmdb`,
    timeout: 20000, // 20 seconds timeout
    withCredentials: true, // Important for cookies
});

/**
 * Request interceptor to attach the authentication token to headers.
 * Retrieves 'auth_token' from localStorage.
 * 
 * UPDATE: We now use HttpOnly cookies, so we don't need to manually attach the token.
 * The browser will handle it automatically via withCredentials: true.
 */
// tmdb.interceptors.request.use(...) - Removed

/**
 * Concurrency Manager to limit simultaneous requests
 */
class ConcurrencyManager {
    /**
     * @param {AxiosInstance} axiosInstance 
     * @param {number} [MAX_CONCURRENT=3] 
     */
    constructor(axiosInstance, MAX_CONCURRENT = 3) {
        this.axiosInstance = axiosInstance;
        this.MAX_CONCURRENT = MAX_CONCURRENT;
        this.queue = [];
        this.runningCount = 0;

        // Request interceptor to queue requests
        this.axiosInstance.interceptors.request.use((config) => {
            return new Promise((resolve) => {
                this.queue.push({ config, resolve });
                this.processQueue();
            });
        });

        // Response interceptor to decrement running count
        this.axiosInstance.interceptors.response.use(
            (response) => {
                this.runningCount--;
                this.processQueue();
                return response;
            },
            (error) => {
                this.runningCount--;
                this.processQueue();
                return Promise.reject(error);
            }
        );
    }

    /**
     * Process the next request in the queue if slot available
     */
    processQueue() {
        if (this.runningCount >= this.MAX_CONCURRENT || this.queue.length === 0) {
            return;
        }

        this.runningCount++;
        const { config, resolve } = this.queue.shift();
        resolve(config);
    }
}

// Apply concurrency limiting FIRST so its response interceptor runs before the retry logic
// Response Interceptors run in the order they are added.
// We want to release the concurrency slot (runningCount--) BEFORE we attempt a retry.
new ConcurrencyManager(tmdb, 10);

/**
 * Request interceptor to append default language to every request.
 * API Key is now handled by the backend proxy.
 */
tmdb.interceptors.request.use((config) => {
    // Check if params exists, if not create it
    if (!config.params) {
        config.params = {};
    }

    // Append language (API key is added by backend)
    config.params.language = 'en-US';

    return config;
}, (error) => {
    return Promise.reject(error);
});

/**
 * Response interceptor for retrying failed requests
 */
tmdb.interceptors.response.use(undefined, async (err) => {
    const { config, message } = err;

    // Retry count property
    if (!config || !config.retry) {
        config.retry = 0;
    }

    // Check if we should retry
    // Retry on timeout (ECONNABORTED) or network error or 5xx status or 429 rate limit
    const shouldRetry =
        config.retry < 3 &&
        (err.code === 'ECONNABORTED' ||
            message === 'Network Error' ||
            (err.response && (err.response.status >= 500 || err.response.status === 429)));

    if (shouldRetry) {
        config.retry += 1;

        // Exponential backoff delay: 1s, 2s, 4s
        const backoffDelay = Math.pow(2, config.retry - 1) * 1000;

        const statusInfo = err.response ? ` (Status: ${err.response.status})` : '';
        console.log(`[TMDB] Retrying request to ${config.url}${statusInfo} (Attempt ${config.retry}/3) in ${backoffDelay}ms`);

        // Create a promise to wait for the backoff delay
        const backoff = new Promise(resolve => setTimeout(resolve, backoffDelay));

        // Return the promise which resolves to re-running the axios request
        return backoff.then(() => tmdb(config));
    }

    // Log final failure for debugging
    const statusInfo = err.response ? ` (Status: ${err.response.status})` : '';
    console.error(`[TMDB] Request failed after ${config.retry} retries: ${config.url}${statusInfo}`, err.message);

    return Promise.reject(err);
});

export default tmdb;
