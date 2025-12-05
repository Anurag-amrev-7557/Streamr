import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

const BASE_URL = 'http://localhost:3000/api/tmdb';

async function testFeed(name, endpoint) {
    console.log(`\nTesting ${name} Feed...`);
    const start = Date.now();
    try {
        const response = await axios.get(`${BASE_URL}${endpoint}`);
        const duration = Date.now() - start;

        console.log(`✅ Success in ${duration}ms`);
        console.log(`   Response Header X-Cache: ${response.headers['x-cache']}`);
        if (Array.isArray(response.data)) {
            console.log(`   Items: ${response.data.length} rows`);
            if (response.data.length > 0) {
                console.log(`   First Row: "${response.data[0].title}" with ${response.data[0].data.length} movies`);
            }
        } else {
            console.log('   ❌ Unexpected format: Not an array');
        }
    } catch (error) {
        console.error(`❌ Failed: ${error.message}`);
        if (error.response) {
            console.error('   Status:', error.response.status);
            console.error('   Data:', error.response.data);
        }
    }
}

async function verify() {
    console.log('Starting Feed Verification...');

    // Test Generic Feeds
    await testFeed('Home (Guest)', '/feed/home');
    await testFeed('Movies', '/feed/movies');
    await testFeed('Series', '/feed/series');

    // Test Cache Hit (Run again)
    console.log('\n--- Re-running for Cache Hits ---');
    await testFeed('Home (Guest Cached)', '/feed/home');
}

verify();
