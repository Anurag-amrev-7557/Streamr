import { scrapeHicineSearch } from './scraper.js';

async function test() {
    console.log('Testing scraper for "Stranger Things"...');
    try {
        const results = await scrapeHicineSearch('Stranger Things');
        // Find the series result
        const series = results.find(r => r.type === 'series');

        if (series && series.seasons) {
            console.log(`Found Series: ${series.title}`);
            series.seasons.forEach(s => {
                console.log(`Season ${s.season}:`);
                // Check first few episodes
                s.episodes.slice(0, 3).forEach(e => {
                    console.log(`  Episode ${e.episode}:`);
                    e.downloads.forEach(d => {
                        console.log(`    Label: ${d.quality} | Link: ${d.link}`);
                    });
                });
            });
        } else {
            console.log('No series found or no seasons.');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
