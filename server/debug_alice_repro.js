import { scrapeHicineSearch } from './utils/scraper.js';
import logger from './utils/logger.js';

// Mock logger
logger.info = console.log;
logger.error = console.error;
logger.warn = console.warn;

async function debugScraper() {
    const query = "Alice in Borderland";
    console.log(`Searching for: ${query}`);

    try {
        // Simulate metadata from frontend
        const metadata = {
            year: "2020", // Alice in Borderland released in 2020
            type: "series",
            seasons: 2 // Assuming we know it has 2 seasons
        };
        const results = await scrapeHicineSearch(query, metadata);
        console.log(`Found ${results.length} results:`);
        results.forEach((r, i) => {
            console.log(`${i + 1}. Title: ${r.title}`);
            console.log(`   Year: ${r.year}`);
            console.log(`   Type: ${r.type}`);
            console.log(`   Seasons: ${r.seasons ? r.seasons.length : 0}`);
            // Log a bit of the object to see what else we have
            console.log(`   Full Object Keys: ${Object.keys(r).join(', ')}`);
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

debugScraper();
