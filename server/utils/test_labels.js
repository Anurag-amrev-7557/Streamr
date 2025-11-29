import { scrapeHicineSearch } from './scraper.js';

async function test() {
    console.log('Testing scraper for "12th fail"...');
    try {
        const results = await scrapeHicineSearch('12th fail');
        results.forEach((r, i) => {
            console.log(`[${i}] Title: ${r.title} (${r.type})`);
            if (r.downloads) {
                r.downloads.forEach(d => {
                    console.log(`    Label: ${d.quality} | Link: ${d.link}`);
                });
            }
            console.log('---');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

test();
