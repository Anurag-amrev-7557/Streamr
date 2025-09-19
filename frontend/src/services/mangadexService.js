// MangaDex API service (drop-in replacement for Comick flows)
import { getApiEndpoint } from '../config/api';

const getMangadexBase = () => {
	try {
		return getApiEndpoint('/mangadex');
	} catch (e) {
		return '/api/v1/mangadex';
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
		} else if (typeof value === 'object' && value && key.includes('order[')) {
			// Already encoded order keys
			qs.set(key, String(value));
		} else {
			qs.set(key, String(value));
		}
	});
	const s = qs.toString();
	return s ? `?${s}` : '';
};

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

const responseCache = new Map();
const inFlight = new Map();
const getNowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());
const makeCacheKey = (input, init) => {
	const url = typeof input === 'string' ? input : (input?.url || String(input));
	const method = (init && init.method) || 'GET';
	return `${method} ${url}`;
};

const safeFetchJson = async (input, init = {}) => {
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), init.timeout || 12000);
	try {
		const res = await fetch(input, { ...init, cache: 'no-store', signal: controller.signal, headers: { 'accept': 'application/json', ...(init.headers || {}) } });
		const contentType = res.headers?.get?.('content-type') || '';
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`MangaDex API ${res.status}: ${text || res.statusText}`);
		}
		if (!contentType.toLowerCase().includes('application/json')) {
			const text = await res.text().catch(() => '');
			throw new Error(`MangaDex API invalid content-type: ${contentType || 'unknown'} - ${text?.slice(0,200) || ''}`);
		}
		try {
			return await res.json();
		} catch (e) {
			const text = await res.text().catch(() => '');
			throw new Error(`MangaDex API parse error: ${e.message}. Body preview: ${text?.slice(0,200)}`);
		}
	} finally {
		clearTimeout(timeoutId);
	}
};

const fetchJsonCached = async (input, init = {}, options = {}) => {
	const { ttlMs = 0, forceRefresh = false } = options;
	const method = (init && init.method) || 'GET';
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

const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(s || ''));

export const mangadexService = {
	// Simulated top: order by followedCount desc -> normalized to legacy shape used by UI
	getTop: async (options = {}) => {
		const { accept_mature_content = false } = options;
		const ratings = accept_mature_content ? ['safe', 'suggestive', 'erotica', 'pornographic'] : ['safe', 'suggestive'];
		const params = {
			'order[followedCount]': 'desc',
			'limit': 30,
			'includes[]': ['cover_art'],
			'contentRating[]': ratings,
		};
		const url = `${getMangadexBase()}/manga${buildQuery(params)}`;
		const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 180_000 });
		const list = Array.isArray(resp?.data) ? resp.data : [];
		// Normalize items so UI reading Comick fields still works
		return list.map(m => {
			const id = m?.id;
			const attrs = m?.attributes || {};
			const title = attrs?.title?.en || Object.values(attrs?.title || {})[0] || '';
			// find cover filename from relationships
			const coverRel = (m?.relationships || []).find(r => r?.type === 'cover_art');
			const fileName = coverRel?.attributes?.fileName;
			const proxyUrl = (id && fileName) ? `${getMangadexBase()}/cover/${id}/${fileName}?s=256` : null;
			const directUrl = (id && fileName) ? `https://uploads.mangadex.org/covers/${id}/${fileName}.256.jpg` : null;
			return {
				id,
				slug: id,
				title,
				cover: { b2key: null },
				md_covers: fileName ? [{ b2key: null, url: proxyUrl, fallback: directUrl }] : [],
				comic: { slug: id, title }
			};
		});
	},

	// Genres/Tags
	getGenres: async () => {
		const url = `${getMangadexBase()}/manga/tag`;
		const data = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(8000) }, { ttlMs: 86_400_000 });
		const tags = Array.isArray(data?.data) ? data.data : [];
		return tags.map(t => ({ id: t?.id, name: t?.attributes?.name?.en || Object.values(t?.attributes?.name || {})[0] || '' }));
	},

	// MangaDex doesn't have categories endpoint; return empty array to stay compatible
	getCategories: async () => [],

	// Latest chapters
	getLatestChapters: (options = {}) => {
		const { lang = 'en', page = 1, order = 'hot' } = options;
		const limit = 30;
		const offset = (page - 1) * limit;
		const params = {
			'translatedLanguage[]': [lang],
			'order[publishAt]': 'desc',
			'limit': limit,
			'offset': Math.max(0, offset)
		};
		const url = `${getMangadexBase()}/chapter${buildQuery(params)}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 60_000 });
	},

	// Chapter info
	getChapterInfo: (id) => {
		if (!id) throw new Error('chapter id is required');
		const url = `${getMangadexBase()}/chapter/${encodeURIComponent(id)}`;
		return fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 600_000 });
	},

	// Chapter images via At-Home (returns array of full image URLs for compatibility)
	getChapterImages: async (id) => {
		if (!id) throw new Error('chapter id is required');
		const atHome = await fetchJsonCached(`${getMangadexBase()}/at-home/server/${encodeURIComponent(id)}?forcePort443=true`, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 1_800_000 });
		const chapterInfo = await mangadexService.getChapterInfo(id);
		const baseUrl = atHome?.baseUrl;
		const hash = chapterInfo?.data?.attributes?.hash;
		const files = chapterInfo?.data?.attributes?.data || [];
		// Prefer original quality; fallback to data-saver when empty
		const urls = (Array.isArray(files) && files.length ? files : (chapterInfo?.data?.attributes?.dataSaver || []))
			.map(name => `${baseUrl}/${Array.isArray(files) && files.length ? 'data' : 'data-saver'}/${hash}/${name}`);
		return urls;
	},

	// Comic chapters by manga id (normalized shape)
	getComicChapters: async (id, options = {}) => {
		if (!id) throw new Error('manga id is required');
		const { limit = 100, page = 1, lang = 'en', chapOrder = 'asc' } = options;
		const offset = (page - 1) * limit;
		const params = {
			'manga': id,
			'translatedLanguage[]': [lang],
			'order[chapter]': chapOrder,
			'limit': limit,
			'offset': Math.max(0, offset),
			'includes[]': ['scanlation_group', 'user']
		};
		const url = `${getMangadexBase()}/chapter${buildQuery(params)}`;
		const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 120_000 });
		const list = Array.isArray(resp?.data) ? resp.data : [];
		const mapped = list.map(ch => {
			const a = ch?.attributes || {};
			return {
				id: ch?.id,
				hid: ch?.id,
				chap: a?.chapter || null,
				vol: a?.volume || null,
				lang: a?.translatedLanguage || null,
				title: a?.title || '',
				pages: a?.pages || 0,
				created_at: a?.publishAt || a?.createdAt || null,
				groups: (ch?.relationships || []).filter(r => r?.type === 'scanlation_group').map(g => ({ id: g?.id, name: g?.attributes?.name })).filter(g => g.name)
			};
		});
		return { data: mapped, limit: resp?.limit, offset: resp?.offset, total: resp?.total };
	},

	// Volumes/chapters aggregate for a manga (grouped by volume)
	getMangaAggregate: async (id, options = {}) => {
		if (!id) throw new Error('manga id is required');
		const { lang = 'en' } = options;
		const url = `${getMangadexBase()}/manga/${encodeURIComponent(id)}/aggregate${buildQuery({ 'translatedLanguage[]': [lang] })}`;
		const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(15000) }, { ttlMs: 600_000 });
		// Return as-is plus a lightweight normalized helper
		const volumes = resp?.volumes || {};
		const normalized = [];
		Object.entries(volumes).forEach(([vol, vdata]) => {
			const chs = vdata?.chapters || {};
			Object.entries(chs).forEach(([chap, cdata]) => {
				normalized.push({ vol, chap, count: cdata?.count, id: cdata?.id });
			});
		});
		return { raw: resp, volumes, list: normalized };
	},

	// Comic info: accept UUID directly; if not UUID, treat as title and search first
	getComicInfo: async (slugOrId, options = {}) => {
		if (!slugOrId) throw new Error('slug or id is required');
		const includes = ['cover_art', 'author', 'artist', 'tag'];
		if (isUuid(slugOrId)) {
			const url = `${getMangadexBase()}/manga/${encodeURIComponent(slugOrId)}${buildQuery({ 'includes[]': includes })}`;
			const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(9_000) }, { ttlMs: 900_000 });
			return resp?.data || resp;
		}
		// Fallback: search by title and return first match
		const searchResp = await mangadexService.search({ q: String(slugOrId), limit: 1 });
		const first = Array.isArray(searchResp?.data) ? searchResp.data[0] : null;
		if (!first) return searchResp;
		const id = first?.id;
		const url = `${getMangadexBase()}/manga/${encodeURIComponent(id)}${buildQuery({ 'includes[]': includes })}`;
		const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 900_000 });
		return resp?.data || resp;
	},

	// Search mangas
	search: async (options = {}) => {
		const {
			genres,
			excludes,
			page = 1,
			limit = 15,
			content_rating,
			q,
			showall = true,
			translatedLanguage = ['en']
		} = options;
		const offset = (page - 1) * limit;
		const params = {
			'title': q || undefined,
			'limit': limit,
			'offset': Math.max(0, offset),
			'includes[]': ['cover_art'],
			'availableTranslatedLanguage[]': translatedLanguage,
		};
		if (Array.isArray(genres) && genres.length) params['includedTags[]'] = genres;
		if (Array.isArray(excludes) && excludes.length) params['excludedTags[]'] = excludes;
		const ratings = Array.isArray(content_rating) ? content_rating : (showall ? ['safe', 'suggestive', 'erotica'] : ['safe', 'suggestive']);
		params['contentRating[]'] = ratings;
		const url = `${getMangadexBase()}/manga${buildQuery(params)}`;
		const resp = await fetchJsonCached(url, { timeout: getAdaptiveTimeoutMs(20000) }, { ttlMs: 30_000 });
		const list = Array.isArray(resp?.data) ? resp.data : [];
		return list.map(m => {
			const id = m?.id;
			const attrs = m?.attributes || {};
			const title = attrs?.title?.en || Object.values(attrs?.title || {})[0] || '';
			const coverRel = (m?.relationships || []).find(r => r?.type === 'cover_art');
			const fileName = coverRel?.attributes?.fileName;
			const proxyUrl = (id && fileName) ? `${getMangadexBase()}/cover/${id}/${fileName}?s=256` : null;
			const directUrl = (id && fileName) ? `https://uploads.mangadex.org/covers/${id}/${fileName}.256.jpg` : null;
			return { id, slug: id, title, md_covers: proxyUrl ? [{ url: proxyUrl, fallback: directUrl }] : [], comic: { slug: id, title } };
		});
	},

	// Title suggestions via search
	getTitleSuggestions: async (q, options = {}) => {
		if (!q || String(q).trim().length < 2) return [];
		const { limit = 10 } = options;
		const resp = await mangadexService.search({ q: String(q).trim(), limit });
		const list = Array.isArray(resp?.data) ? resp.data : [];
		return list.map(it => it?.attributes?.title?.en || Object.values(it?.attributes?.title || {})[0] || '').filter(Boolean);
	},
};

export default mangadexService;


