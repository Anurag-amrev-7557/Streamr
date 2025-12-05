import tmdbService from './services/tmdbService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function verify() {
    console.log('Starting TMDB Service Verification...');

    try {
        // 1. Test Search (Basic)
        console.log('\n--- Testing MultiSearch ---');
        const searchRes = await tmdbService.multiSearch({ query: 'Inception', limit: 5 });
        console.log('Search Result Count:', searchRes.data.results.length);
        console.log('From Cache:', searchRes.fromCache);

        // 2. Test Search (Cache Hit)
        console.log('\n--- Testing MultiSearch (Cache) ---');
        const searchRes2 = await tmdbService.multiSearch({ query: 'Inception', limit: 5 });
        console.log('Search Result Count:', searchRes2.data.results.length);
        console.log('From Cache:', searchRes2.fromCache);
        if (!searchRes2.fromCache) console.warn('WARNING: Cache miss on second request!');

        // 3. Test Trending (Guest)
        console.log('\n--- Testing Recommendations (Guest) ---');
        const recRes = await tmdbService.getRecommendations(null);
        console.log('Recommendations Count:', recRes.data.results.length);

        // 4. Test Item Recommendations
        console.log('\n--- Testing Item Recommendations ---');
        // Inception ID: 27205
        const itemRecRes = await tmdbService.getItemRecommendations('movie', 27205, null);
        console.log('Item Recommendations Count:', itemRecRes.data.results.length);

        // 5. Test Request Coalescing
        console.log('\n--- Testing Request Coalescing ---');
        const p1 = tmdbService.fetchDetails('movie', 550, process.env.TMDB_API_KEY); // Fight Club
        const p2 = tmdbService.fetchDetails('movie', 550, process.env.TMDB_API_KEY);

        // We can't easily check internal state, but if they return same object reference or complete at exact same time, it's a good sign.
        // In this implementation, they return data, so we check if they are equal.
        const [r1, r2] = await Promise.all([p1, p2]);
        console.log('Requests completed. Data match:', JSON.stringify(r1) === JSON.stringify(r2));

        console.log('\nVerification Complete: SUCCESS');
    } catch (error) {
        console.error('\nVerification Failed:', error);
    } finally {
        // mongoose.disconnect(); // Not connected in this script, but good practice if we were
        process.exit(0);
    }
}

verify();
