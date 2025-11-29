import { scrapeHicineSearch } from './scraper.js'; // eslint-disable-line no-unused-vars
import axios from 'axios';

const API_BASE_URL = 'https://api.hicine.info/api';

async function test() {
    console.log('Testing scraper for "Squid Game"...');
    try {
        const url = `${API_BASE_URL}/search/${encodeURIComponent('Squid Game')}`;
        const response = await axios.get(url);

        if (response.data && Array.isArray(response.data)) {
            response.data.forEach((item, i) => {
                console.log(`[${i}] Title: ${item.title}`);
                console.log(`    contentType: ${item.contentType}`);
                const seasonKeys = Object.keys(item).filter(k => k.startsWith('season_'));
                console.log(`    Season Keys: ${seasonKeys.join(', ')}`);
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
