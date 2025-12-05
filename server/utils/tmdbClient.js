import axios from 'axios';
import https from 'https';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

const CONFIG = {
    TIMEOUT: 10000,
    CIRCUIT_BREAKER: {
        FAILURE_THRESHOLD: 5,
        RESET_TIMEOUT: 30000, // 30 seconds
    },
    RETRY: {
        MAX_RETRIES: 3,
        INITIAL_DELAY: 1000,
    }
};

class TMDBClient {
    constructor() {
        this.client = axios.create({
            baseURL: TMDB_BASE_URL,
            timeout: CONFIG.TIMEOUT,
            httpsAgent: new https.Agent({ keepAlive: true })
        });

        this.pendingRequests = new Map();

        // Circuit Breaker State
        this.failures = 0;
        this.lastFailureTime = 0;
        this.circuitOpen = false;

        // Setup Interceptors
        this.setupInterceptors();
    }

    setupInterceptors() {
        this.client.interceptors.response.use(
            response => {
                this.recordSuccess();
                return response;
            },
            async error => {
                this.recordFailure();

                const config = error.config;

                // Handle Rate Limiting (429), Server Errors (5xx), and Network Errors
                const shouldRetry =
                    config &&
                    !config._retry &&
                    (
                        (error.response?.status === 429 || error.response?.status >= 500) ||
                        (error.code === 'ECONNABORTED' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT')
                    );

                if (shouldRetry) {
                    config._retry = true;
                    config.retryCount = config.retryCount || 0;

                    if (config.retryCount < CONFIG.RETRY.MAX_RETRIES) {
                        config.retryCount++;
                        const delay = CONFIG.RETRY.INITIAL_DELAY * Math.pow(2, config.retryCount - 1);

                        console.warn(`TMDB Retry ${config.retryCount}/${CONFIG.RETRY.MAX_RETRIES} for ${config.url} due to ${error.code || error.response?.status}`);

                        // Wait for delay
                        await new Promise(resolve => setTimeout(resolve, delay));

                        return this.client(config);
                    }
                }
                return Promise.reject(error);
            }
        );
    }

    recordSuccess() {
        if (this.circuitOpen) {
            this.circuitOpen = false;
            this.failures = 0;
            console.log('TMDB Circuit Breaker: CLOSED (Recovered)');
        }
    }

    recordFailure() {
        this.failures++;
        this.lastFailureTime = Date.now();

        if (this.failures >= CONFIG.CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
            this.circuitOpen = true;
            console.warn('TMDB Circuit Breaker: OPEN (Too many failures)');
        }
    }

    checkCircuit() {
        if (this.circuitOpen) {
            if (Date.now() - this.lastFailureTime > CONFIG.CIRCUIT_BREAKER.RESET_TIMEOUT) {
                // Half-open state: allow one request to try
                return true;
            }
            throw new Error('TMDB Service Unavailable (Circuit Breaker Open)');
        }
        return true;
    }

    async get(endpoint, params = {}) {
        this.checkCircuit();

        const cacheKey = `${endpoint}_${JSON.stringify(params)}`;

        // Request Coalescing
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }

        const requestPromise = this.client.get(endpoint, { params })
            .then(res => {
                this.pendingRequests.delete(cacheKey);
                return res;
            })
            .catch(err => {
                this.pendingRequests.delete(cacheKey);
                throw err;
            });

        this.pendingRequests.set(cacheKey, requestPromise);
        return requestPromise;
    }
}

export default new TMDBClient();
