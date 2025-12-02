import axios from 'axios';

const API_BASE_URL = 'https://api.hicine.info/api';
const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'x-api-key': 'hicine_website_secret_2025_exi9epdmrns',
    'Origin': 'https://hicine.info',
    'Referer': 'https://hicine.info/'
};

/**
 * Searches for movies/series using hicine API.
 * @param {string} query - The search query.
 * @returns {Promise<Array>} - Array of search results with download links.
 */
export const scrapeHicineSearch = async (query) => {
    try {
        console.log(`[API] Searching for: ${query}`);
        const url = `${API_BASE_URL}/search/${encodeURIComponent(query)}`;
        const response = await axios.get(url, { headers: HEADERS });

        if (!response.data || !Array.isArray(response.data)) {
            console.warn('[API] Unexpected response format:', response.data);
            return [];
        }

        // Fetch details for each item to get links
        const results = await Promise.all(response.data.map(async (item) => {
            try {
                const details = await fetchDetails(item._id, item.contentType);
                const mergedItem = { ...item, ...details };

                const isSeries = mergedItem.contentType === 'series' || !!mergedItem.season_1;

                if (isSeries) {
                    return {
                        title: mergedItem.title,
                        poster: mergedItem.featured_image,
                        type: 'series',
                        seasons: parseSeries(mergedItem),
                        year: extractYear(mergedItem.title),
                        source_id: mergedItem._id
                    };
                } else {
                    return {
                        title: mergedItem.title,
                        poster: mergedItem.featured_image,
                        type: 'movie',
                        downloads: parseLinks(mergedItem.links),
                        year: extractYear(mergedItem.title),
                        source_id: mergedItem._id
                    };
                }
            } catch (err) {
                console.error(`[API] Failed to fetch details for ${item.title}:`, err.message);
                return null;
            }
        }));

        return results.filter(r => r !== null);

    } catch (error) {
        console.error('[API] Search Error:', error.message);
        return [];
    }
};

/**
 * Fetches details for a specific item.
 * @param {string} id 
 * @param {string} type 
 * @returns {Promise<Object>}
 */
const fetchDetails = async (id, type) => {
    // Map contentType to API endpoint
    let endpoint = 'movies'; // Default
    if (type === 'series') endpoint = 'series';
    else if (type === 'bolly_movies') endpoint = 'bollywood_movies';
    else if (type === 'bolly_series') endpoint = 'bollywood_series';
    else if (type === 'anime') endpoint = 'anime';
    else if (type === 'hollywood_series') endpoint = 'hollywood_series';
    else if (type === 'hollywood_movies') endpoint = 'hollywood_movies';

    const url = `${API_BASE_URL}/${endpoint}/${id}`;

    try {
        const response = await axios.get(url, { headers: HEADERS });
        return response.data;
    } catch (error) {
        console.log(`[API] Primary endpoint ${endpoint} failed for ${id}. Trying fallbacks...`);

        // Fallback list
        const fallbacks = [
            'movies',
            'series',
            'bollywood_movies',
            'bollywood_series',
            'hollywood_movies',
            'hollywood_series',
            'anime'
        ];

        for (const fb of fallbacks) {
            if (fb === endpoint) continue; // Skip the one we already tried

            try {
                const fallbackUrl = `${API_BASE_URL}/${fb}/${id}`;
                const response = await axios.get(fallbackUrl, { headers: HEADERS });
                console.log(`[API] Fallback success: ${fb}`);
                return response.data;
            } catch (e) {
                // Continue to next fallback
            }
        }

        throw new Error(`All endpoints failed for ${id}`);
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
    const parts = text.split(/Episode\s+(\d+)\s*:/i);
    const episodes = [];

    for (let i = 1; i < parts.length; i += 2) {
        const episodeNum = parseInt(parts[i]);
        const content = parts[i + 1];

        if (content) {
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
    let blocks = linksStr.trim().split('\n').filter(b => b.trim());

    if (blocks.length <= 1 && linksStr.includes(' : ')) {
        blocks = linksStr.split(/\s+:\s+/);
    }

    blocks.forEach(block => {
        const urlRegex = /(https?:\/\/[^\s,]+)/g;
        const urls = block.match(urlRegex);

        if (urls) {
            let groupQuality = 'Unknown';
            const lowerBlock = block.toLowerCase();

            if (lowerBlock.includes('2160p') || lowerBlock.includes('4k')) groupQuality = '4K';
            else if (lowerBlock.includes('1080p')) groupQuality = '1080p';
            else if (lowerBlock.includes('720p')) groupQuality = '720p';
            else if (lowerBlock.includes('480p')) groupQuality = '480p';

            urls.forEach(url => {
                const cleanUrl = url.replace(/[),]+$/, '').trim();

                if (!cleanUrl.includes('empty')) {
                    let linkQuality = groupQuality;
                    const lowerUrl = cleanUrl.toLowerCase();

                    if (lowerUrl.includes('2160p') || lowerUrl.includes('4k')) linkQuality = '4K';
                    else if (lowerUrl.includes('1080p')) linkQuality = '1080p';
                    else if (lowerUrl.includes('720p')) linkQuality = '720p';
                    else if (lowerUrl.includes('480p')) linkQuality = '480p';

                    const features = [];
                    const textToCheck = (lowerBlock + ' ' + lowerUrl).toLowerCase();

                    if (textToCheck.includes('hevc') || textToCheck.includes('x265')) features.push('HEVC');
                    else if (textToCheck.includes('x264') || textToCheck.includes('h.264') || textToCheck.includes('h264')) features.push('x264');
                    else if (textToCheck.includes('av1')) features.push('AV1');

                    if (textToCheck.includes('10bit')) features.push('10bit');
                    if (textToCheck.includes('hdr')) features.push('HDR');
                    if (textToCheck.includes('dv') || textToCheck.includes('dolby vision')) features.push('DV');

                    if (textToCheck.includes('atmos')) features.push('Atmos');
                    else if (textToCheck.includes('ddp5.1') || textToCheck.includes('ddp')) features.push('DDP5.1');
                    else if (textToCheck.includes('aac')) features.push('AAC');

                    let finalLabel = linkQuality;
                    if (features.length > 0) {
                        finalLabel += ` (${features.join(' ')})`;
                    }

                    links.push({
                        link: cleanUrl,
                        quality: finalLabel,
                        originalQuality: linkQuality,
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
