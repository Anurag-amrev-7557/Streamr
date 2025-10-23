// Comick API service
// Use configured backend base to avoid SPA HTML fallbacks on deployed frontend
import { getApiEndpoint } from '../config/api';
// Lazily compute base to avoid potential init-order issues in bundled chunks
const getComickBase = () => {
	try {
		return getApiEndpoint('/comick');
	} catch (e) {
		// Fallback for early-load contexts
		return '/api/v1/comick';
	}
};

const buildQuery = (params = {}) => {
	const qs = new URLSearchParams();
	Object.entries(params).forEach(([key, value]) => {
		if (value === undefined || value === null) return;
		if (Array.isArray(value)) {
			value.forEach(v => {
				if (v !== undefined && v !== null && v !== '') qs.append(key, v);
			});
		} else {
			qs.set(key, String(value));
		}
	});
	const s = qs.toString();
	return s ? `?${s}` : '';
};

// Network-aware timeout helper
const getAdaptiveTimeoutMs = (baseMs) => {
	try {
		const nav = typeof navigator !== 'undefined' ? navigator : null;
		const conn = nav && (nav.connection || nav.mozConnection || nav.webkitConnection);
		const saveData = !!(conn && conn.saveData);
		const eff = (conn && conn.effectiveType) || '';
		let factor = 1;
		if (saveData) factor *= 1.5;
		if (eff.includes('2g')) factor *= 2.0;
		else if (eff.includes('3g')) factor *= 1.5;
		else if (eff.includes('4g')) factor *= 1.0;
		return Math.round(baseMs * factor);
	} catch {
		return baseMs;
	}
};

// In-memory cache with TTL and in-flight request deduplication
const responseCache = new Map(); // key -> { expiry: number, data: any }
const inFlight = new Map(); // key -> Promise<any>

const getNowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const makeCacheKey = (input, init) => {
	const url = typeof input === 'string' ? input : (input?.url || String(input));
	const method = (init && init.method) || 'GET';
	return `${method} ${url}`;
};

const fetchJsonCached = async (input, init = {}, options = {}) => {
	const { ttlMs = 0, forceRefresh = false } = options;
	const method = (init && init.method) || 'GET';
	// Only cache idempotent GETs
	if (method.toUpperCase() !== 'GET' || ttlMs <= 0) {
		return safeFetchJson(input, init);
	}
	const key = makeCacheKey(input, init);
	const now = getNowMs();
	if (!forceRefresh) {
		const cached = responseCache.get(key);
		if (cached && cached.expiry > now) {
			return cached.data;
		}
		const inflight = inFlight.get(key);
		if (inflight) return inflight;
	}
	const p = (async () => {
		try {
			const data = await safeFetchJson(input, init);
			responseCache.set(key, { expiry: now + ttlMs, data });
			return data;
		} finally {
			inFlight.delete(key);
		}
	})();
	inFlight.set(key, p);
	return p;
};

const safeFetchJson = async (input, init = {}) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), init.timeout || 12000);
	try {
		console.debug('[Comick] Request:', input);
		const res = await fetch(input, { ...init, cache: 'no-store', signal: controller.signal, headers: { 'accept': 'application/json', ...(init.headers || {}) } });
		const contentType = res.headers?.get?.('content-type') || '';
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			console.error('[Comick] Error response', res.status, text || res.statusText);
			throw new Error(`Comick API ${res.status}: ${text || res.statusText}`);
		}
		if (!contentType.toLowerCase().includes('application/json')) {
			const text = await res.text().catch(() => '');
			throw new Error(`Comick API invalid content-type: ${contentType || 'unknown'} - ${text?.slice(0,200) || ''}`);
		}
		try {
			const json = await res.json();
			console.debug('[Comick] Success:', input, Array.isArray(json) ? `array(${json.length})` : Object.keys(json || {}).slice(0,5));
			return json;
		} catch (e) {
			const text = await res.text().catch(() => '');
			throw new Error(`Comick API parse error: ${e.message}. Body preview: ${text?.slice(0,200)}`);
		}
	} finally {
		clearTimeout(timeoutId);
	}
};

export const comickService = {
	// GET /top
	getTop: (options = {}) => {
		const { gender, day, type = 'trending', comic_types, accept_mature_content = false } = options;
		const query = buildQuery({ gender, day, type, 'comic_types': comic_types, accept_mature_content });
		const url = `${getComickBase()}/top${query}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(8000) }, { ttlMs: 180_000 }); // 3 min
	},

	// GET /category/
	getCategories: () => fetchJsonCached(`${getComickBase()}/category/`, { timeout: getAdaptiveTimeoutMs(8000) }, { ttlMs: 86_400_000 }), // 1 day

	// GET /genre/
	getGenres: () => fetchJsonCached(`${getComickBase()}/genre/`, { timeout: getAdaptiveTimeoutMs(8000) }, { ttlMs: 86_400_000 }), // 1 day

	// GET /chapter/
	getLatestChapters: (options = {}) => {
		const { lang, page = 1, gender, order = 'hot', 'device-memory': deviceMemory, tachiyomi, type, accept_erotic_content } = options;
		const query = buildQuery({ lang, page, gender, order, 'device-memory': deviceMemory, tachiyomi, type, accept_erotic_content });
		const url = `${getComickBase()}/chapter/${query}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(9000) }, { ttlMs: 60_000 }); // 1 min
	},

	// GET /chapter/{hid}/
	getChapterInfo: (hid, options = {}) => {
		if (!hid) throw new Error('hid is required');
		const { tachiyomi } = options;
		const query = buildQuery({ tachiyomi });
		const url = `${getComickBase()}/chapter/${encodeURIComponent(hid)}/${query}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(10_000) }, { ttlMs: 600_000 }); // 10 min
	},

	// GET /chapter/{hid}/get_images
	getChapterImages: (hid) => {
		if (!hid) throw new Error('hid is required');
		const url = `${getComickBase()}/chapter/${encodeURIComponent(hid)}/get_images`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(15_000) }, { ttlMs: 1_800_000 }); // 30 min
	},

	// GET /comic/{hid}/chapters
	getComicChapters: (hid, options = {}) => {
		if (!hid) throw new Error('hid is required');
		const { limit = 60, page, 'chap-order': chapOrder, 'date-order': dateOrder, lang, chap } = options;
		const query = buildQuery({ limit, page, 'chap-order': chapOrder, 'date-order': dateOrder, lang, chap });
		const url = `${getComickBase()}/comic/${encodeURIComponent(hid)}/chapters${query}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(10_000) }, { ttlMs: 120_000 }); // 2 min
	},

	// GET /comic/{slug}/ and /v1.0/comic/{slug}/
	getComicInfo: (slug, options = {}) => {
		if (!slug) throw new Error('slug is required');
		const { t, tachiyomi, version = 'v1.0' } = options;
		const query = buildQuery({ t, tachiyomi });
		const base = version === 'v1.0' ? `${getComickBase()}/v1.0/comic` : `${getComickBase()}/comic`;
		const url = `${base}/${encodeURIComponent(slug)}/${query}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(9_000) }, { ttlMs: 900_000 }); // 15 min
	},

	// GET /v1.0/search/
	search: (options = {}) => {
		const {
			genres,
			excludes,
			type = 'comic',
			tags,
			'excluded-tags': excludedTags,
			demographic,
			page = 1,
			limit = 15,
			time,
			country,
			minimum,
			from,
			to,
			status,
			content_rating,
			tachiyomi,
			completed,
			sort,
			'exclude-mylist': excludeMyList,
			showall = false,
			q,
			t = false,
		} = options;
		const query = buildQuery({
			genres,
			excludes,
			type,
			tags,
			'excluded-tags': excludedTags,
			demographic,
			page,
			limit,
			time,
			country,
			minimum,
			from,
			to,
			status,
			content_rating,
			tachiyomi,
			completed,
			sort,
			'exclude-mylist': excludeMyList,
			showall,
			q,
			t,
		});
		const url = `${getComickBase()}/v1.0/search/${query}`;
		// Short TTL as search is dynamic; dedupe prevents bursts
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(8000) }, { ttlMs: 30_000 }); // 30 sec
	},

	// Title suggestions via search (server-side assist)
	getTitleSuggestions: async (q, options = {}) => {
		if (!q || String(q).trim().length < 2) return [];
		const { limit = 10, content_rating = 'safe', showall = true } = options;
		const resp = await comickService.search({ q: String(q).trim(), limit, content_rating, showall, type: 'comic', t: true });
		const list = Array.isArray(resp) ? resp : (resp?.results || resp?.result || resp?.data || resp?.comics || []);
		return list
			.map(it => it?.title || it?.comic?.title || '')
			.filter(Boolean);
	},
};

export default comickService;
