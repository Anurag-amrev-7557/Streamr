import { scrapeHicineSearch } from './utils/scraper.js';
import logger from './utils/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function debugScraper() {
    const queries = [
        "The hangover part II",
        "The hangover part 2",
        "The hangover"
    ];

    const metadata = {
        year: "2011",
        type: "movie"
    };

    for (const query of queries) {
        console.log(`\n--------------------------------------------------`);
        console.log(`Searching for: '${query}'`);
        try {
            const results = await scrapeHicineSearch(query, metadata);
            console.log(`Found ${results.length} results:`);
            results.forEach((r, i) => {
                console.log(`\n${i + 1}. Title: ${r.title}`);
                console.log(`   Year: ${r.year}`);
                console.log(`   Type: ${r.type}`);
                console.log(`   Download Links: ${r.downloadLinks ? r.downloadLinks.length : (r.downloads ? r.downloads.length : 0)}`);
            });
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

debugScraper();
