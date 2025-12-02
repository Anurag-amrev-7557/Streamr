import { scrapeHicineSearch } from './utils/scraper.js';
import logger from './utils/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function debugScraper() {
    const query = "Stranger Things";
    // Stranger Things: Released 2016, Series, 4 Seasons (currently)
    const metadata = {
        year: "2016",
        type: "series",
        seasons: 4
    };

    console.log(`Searching for: ${query} with metadata:`, metadata);

    try {
        const results = await scrapeHicineSearch(query, metadata);
        console.log(`Found ${results.length} results:`);
        results.forEach((r, i) => {
            console.log(`\n${i + 1}. Title: ${r.title}`);
            console.log(`   Year: ${r.year}`);
            console.log(`   Type: ${r.type}`);
            console.log(`   Overview: ${r.overview ? r.overview.substring(0, 50) + '...' : 'N/A'}`);
            console.log(`   Genres: ${Array.isArray(r.genres) ? r.genres.join(', ') : r.genres}`);
            console.log(`   Seasons: ${r.seasons ? r.seasons.length : 0}`);
            console.log('   Full Object:', JSON.stringify(r, null, 2));
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

debugScraper();
