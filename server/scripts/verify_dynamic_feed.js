import axios from 'axios';
import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3000/api/tmdb/feed/home';

async function verifyFeed() {
    console.log(`Testing Dynamic Feed (${BASE_URL})...`);

    try {
        console.log('Fetching Round 1...');
        const start1 = performance.now();
        const res1 = await axios.get(BASE_URL);
        const time1 = performance.now() - start1;
        console.log(`   Time: ${time1.toFixed(0)}ms`);

        console.log('Fetching Round 2...');
        const start2 = performance.now();
        const res2 = await axios.get(BASE_URL);
        const time2 = performance.now() - start2;
        console.log(`   Time: ${time2.toFixed(0)}ms`);

        const feed1 = res1.data;
        const feed2 = res2.data;

        if (!Array.isArray(feed1) || !Array.isArray(feed2)) {
            console.error('Error: Response is not an array.');
            return;
        }

        // 1. Check Sticky Categories (Now only Trending)
        const sticky1 = feed1[0];
        const sticky2 = feed2[0];

        let passed = true;

        if (sticky1.title !== 'Trending Now' || sticky2.title !== 'Trending Now') {
            console.error(`❌ Sticky category mismatch: 1=${sticky1.title}, 2=${sticky2.title}`);
            passed = false;
        } else {
            console.log('✅ Sticky category preserved (Trending Now).');
        }

        // 2. Check Dynamic Categories (Should be shuffled)
        const dynamic1 = feed1.slice(1).map(s => s.title);
        const dynamic2 = feed2.slice(1).map(s => s.title);

        console.log('   1:', dynamic1.slice(0, 3) + ' ...');
        console.log('   2:', dynamic2.slice(0, 3) + ' ...');

        if (JSON.stringify(dynamic1) === JSON.stringify(dynamic2)) {
            console.error('❌ Dynamic categories are NOT shuffled (Identical).');
            passed = false;
        } else {
            console.log('✅ Dynamic categories are SHUFFLED.');
        }

        if (passed) {
            console.log('🎉 Verification PASSED.');
        } else {
            console.log('❌ Verification FAILED.');
        }

    } catch (error) {
        console.error('Verification Failed:', error.message);
    }
}

verifyFeed();
