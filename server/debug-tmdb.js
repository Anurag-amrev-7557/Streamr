import dotenv from 'dotenv';
import axios from 'axios';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

console.log('--- TMDB Debug Script ---');
console.log('Checking Environment Variables...');
if (process.env.TMDB_API_KEY) {
    console.log('✅ TMDB_API_KEY is present');
} else {
    console.error('❌ TMDB_API_KEY is MISSING');
}

import https from 'https';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const tmdbClient = axios.create({
    baseURL: TMDB_BASE_URL,
    timeout: 10000,
    httpsAgent: new https.Agent({ keepAlive: true })
});

async function testConnection() {
    console.log('\nTesting TMDB Connection...');
    try {
        const response = await tmdbClient.get('/movie/popular', {
            params: {
                api_key: process.env.TMDB_API_KEY,
                language: 'en-US',
                page: 1
            }
        });
        console.log(`✅ Connection Successful! Status: ${response.status}`);
        console.log('Sample Data:', response.data.results[0].title);
    } catch (error) {
        console.error('❌ Connection Failed!');
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error('Data:', error.response.data);
        } else if (error.request) {
            console.error('No response received:', error.message);
            if (error.code) console.error('Error Code:', error.code);
        } else {
            console.error('Error:', error.message);
        }
    }
}

testConnection();
