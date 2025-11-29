import axios from 'axios';

const API_BASE_URL = 'https://api.hicine.info/api';

/**
 * Searches for movies/series using hicine API.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} - Array of search results with download links.
 */
export const scrapeHicineSearch = async (query) => {
    try {
        console.log(`[API] Searching for: ${query}`);
        const url = `${API_BASE_URL}/search/${encodeURIComponent(query)}`;
        const response = await axios.get(url);

        if (!response.data || !Array.isArray(response.data)) {
            console.warn('[API] Unexpected response format:', response.data);
            return [];
        }

        return response.data.map(item => {
            const isSeries = item.contentType === 'series' || !!item.season_1;

            if (isSeries) {
                return {
                    title: item.title,
                    poster: item.featured_image,
                    type: 'series',
                    seasons: parseSeries(item),
                    year: extractYear(item.title),
                    source_id: item._id
                };
            } else {
                return {
                    title: item.title,
                    poster: item.featured_image,
                    type: 'movie',
                    downloads: parseLinks(item.links),
                    year: extractYear(item.title),
                    source_id: item._id
                };
            }
        });

    } catch (error) {
        console.error('[API] Search Error:', error.message);
        return [];
    }
};

/**
 * Parses series data to extract seasons and episodes.
 * @param {Object} item - The API result item.
 * @returns {Array} - Array of seasons.
 */
const parseSeries = (item) => {
    const seasons = [];
    // Check for season_1 to season_20 (arbitrary limit)
    for (let i = 1; i <= 20; i++) {
        const seasonKey = `season_${i}`;
        if (item[seasonKey]) {
            const episodes = parseEpisodes(item[seasonKey]);
            const packs = parseSeasonPacks(item[seasonKey]);

            if (episodes.length > 0 || packs.length > 0) {
                seasons.push({
                    season: i,
                    episodes: episodes,
                    packs: packs
                });
            }
        }
    }
    return seasons;
};

/**
 * Parses season text for Zip/Pack links.
 * Looks for keywords like "Zip", "Pack", "Batch" and extracts links.
 * @param {string} text 
 * @returns {Array}
 */
const parseSeasonPacks = (text) => {
    if (!text) return [];

    const packs = [];

    // Split text into lines or segments to find pack-related text
    // Often packs are at the top or labeled "Zip" / "Pack"
    // We'll look for lines containing these keywords and extract links

    // Regex to find lines/blocks with "Zip", "Pack", "Batch" followed by links
    // This is a heuristic.

    // Strategy: Look for specific keywords and parse links near them.
    // Or simpler: Parse ALL links in the text that are NOT part of the "Episode X" structure.
    // But "Episode X" structure parsing removes them from consideration? No, parseEpisodes splits by "Episode X".
    // The text *before* the first "Episode 1" is usually where packs are.

    const parts = text.split(/Episode\s+\d+\s*:/i);
    const headerText = parts[0]; // Text before first episode

    if (headerText) {
        // Check if header text contains pack keywords
        if (/zip|pack|batch|complete/i.test(headerText)) {
            const links = parseLinks(headerText);
            if (links.length > 0) {
                packs.push(...links);
            }
        }
    }

    return packs;
};

/**
 * Parses episode text string.
 * Format usually: "Episode 1 : link, link : link... Episode 2 : ..."
 * @param {string} text 
 * @returns {Array}
 */
const parseEpisodes = (text) => {
    if (!text) return [];

    // Split by "Episode <number> :"
    // We use a regex with capturing group to keep the episode number
    const parts = text.split(/Episode\s+(\d+)\s*:/i);

    const episodes = [];

    // parts[0] is usually header text before first episode
    // parts[1] is episode number, parts[2] is content, parts[3] is next episode number, etc.
    for (let i = 1; i < parts.length; i += 2) {
        const episodeNum = parseInt(parts[i]);
        const content = parts[i + 1];

        if (content) {
            // Split content by ":" which often separates different quality links for the same episode
            // But sometimes it's just commas.
            // Let's just parse all links found in the content string.
            const links = parseLinks(content);
            if (links.length > 0) {
                episodes.push({
                    episode: episodeNum,
                    downloads: links
                });
            }
        }
    }

    return episodes;
};

/**
 * Parses the links string from the API.
 * @param {string} linksStr - Comma separated links or unstructured text.
 * @returns {Array} - Array of link objects.
 */
const parseLinks = (linksStr) => {
    if (!linksStr) return [];


    const links = [];

    // First split by newlines as they often separate quality blocks
    // Filter out empty strings after splitting
    let blocks = linksStr.trim().split('\n').filter(b => b.trim());

    // If splitting by newline didn't give us multiple parts (or just 1 valid part), 
    // try splitting by " : " if it exists.
    if (blocks.length <= 1 && linksStr.includes(' : ')) {
        blocks = linksStr.split(/\s+:\s+/);
    }

    blocks.forEach(block => {
        // Extract all URLs in this block
        const urlRegex = /(https?:\/\/[^\s,]+)/g;
        const urls = block.match(urlRegex);

        if (urls) {
            // Determine quality for this block
            let groupQuality = 'Unknown';
            const lowerBlock = block.toLowerCase();

            if (lowerBlock.includes('2160p') || lowerBlock.includes('4k')) groupQuality = '4K';
            else if (lowerBlock.includes('1080p')) groupQuality = '1080p';
            else if (lowerBlock.includes('720p')) groupQuality = '720p';
            else if (lowerBlock.includes('480p')) groupQuality = '480p';

            urls.forEach(url => {
                // Clean URL
                const cleanUrl = url.replace(/[),]+$/, '').trim();

                if (!cleanUrl.includes('empty')) {
                    // Check if URL itself has specific quality that overrides group quality
                    let linkQuality = groupQuality;
                    const lowerUrl = cleanUrl.toLowerCase();

                    if (lowerUrl.includes('2160p') || lowerUrl.includes('4k')) linkQuality = '4K';
                    else if (lowerUrl.includes('1080p')) linkQuality = '1080p';
                    else if (lowerUrl.includes('720p')) linkQuality = '720p';
                    else if (lowerUrl.includes('480p')) linkQuality = '480p';

                    // Extract additional features from URL or Block text
                    const features = [];
                    const textToCheck = (lowerBlock + ' ' + lowerUrl).toLowerCase();

                    // Codecs
                    if (textToCheck.includes('hevc') || textToCheck.includes('x265')) features.push('HEVC');
                    else if (textToCheck.includes('x264') || textToCheck.includes('h.264') || textToCheck.includes('h264')) features.push('x264');
                    else if (textToCheck.includes('av1')) features.push('AV1');

                    // Video Features
                    if (textToCheck.includes('10bit')) features.push('10bit');
                    if (textToCheck.includes('hdr')) features.push('HDR');
                    if (textToCheck.includes('dv') || textToCheck.includes('dolby vision')) features.push('DV');

                    // Audio
                    if (textToCheck.includes('atmos')) features.push('Atmos');
                    else if (textToCheck.includes('ddp5.1') || textToCheck.includes('ddp')) features.push('DDP5.1');
                    else if (textToCheck.includes('aac')) features.push('AAC');

                    // Construct final label
                    let finalLabel = linkQuality;
                    if (features.length > 0) {
                        finalLabel += ` (${features.join(' ')})`;
                    }

                    links.push({
                        link: cleanUrl,
                        quality: finalLabel,
                        originalQuality: linkQuality, // Keep raw quality for sorting/filtering if needed
                        host: new URL(cleanUrl).hostname
                    });
                }
            });
        }
    });

    return links;
};

/**
 * Extracts year from title string.
 * @param {string} title 
 * @returns {string}
 */
const extractYear = (title) => {
    const match = title.match(/\b(19|20)\d{2}\b/);
    return match ? match[0] : '';
};

export const scrapeHicineDetails = async (id) => { // eslint-disable-line no-unused-vars
    return {};
};
