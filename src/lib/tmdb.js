import axios from 'axios';

const tmdb = axios.create({
    baseURL: "https://api.themoviedb.org/3",
});

// Add a request interceptor to append the API key to every request
tmdb.interceptors.request.use((config) => {
    const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

    // Check if params exists, if not create it
    if (!config.params) {
        config.params = {};
    }

    // Append api_key and language
    config.params.api_key = API_KEY;
    config.params.language = 'en-US';

    return config;
}, (error) => {
    return Promise.reject(error);
});

export default tmdb;
