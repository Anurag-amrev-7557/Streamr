import { getApiEndpoint } from '../config/api';

const getJikanBase = () => {
  try {
    return getApiEndpoint('/jikan');
  } catch {
    return '/api/jikan';
  }
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const responseCache = new Map();
const inFlight = new Map();
const nowMs = () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now());

const fetchJsonCached = async (url, options = {}, { ttlMs = 0 } = {}) => {
  const key = `GET ${url}`;
  const n = nowMs();
  if (ttlMs > 0) {
    const c = responseCache.get(key);
    if (c && c.expiry > n) return c.data;
    const f = inFlight.get(key);
    if (f) return f;
  }
  const p = (async () => {
    try {
      const res = await fetch(url, { ...options, headers: { accept: 'application/json', ...(options.headers || {}) } });
      if (!res.ok) {
        const t = await res.text().catch(() => '');
        throw new Error(`Jikan ${res.status}: ${t || res.statusText}`);
      }
      return res.json();
    } finally {
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, p);
  const data = await p;
  if (ttlMs > 0) responseCache.set(key, { expiry: n + ttlMs, data });
  return data;
};

const jikanService = {
  searchManga: (params = {}) => {
    const { q, page = 1, limit = 20, type, status, order_by = 'popularity', sort = 'desc', sfw = true } = params;
    const query = buildQuery({ q, page, limit, type, status, order_by, sort, sfw });
    return fetchJsonCached(`${getJikanBase()}/manga${query}`, {}, { ttlMs: 30_000 });
  },
  getMangaById: (malId) => {
    return fetchJsonCached(`${getJikanBase()}/manga/${encodeURIComponent(malId)}`, {}, { ttlMs: 86_400_000 });
  },
  getMangaFullById: (malId) => {
    return fetchJsonCached(`${getJikanBase()}/manga/${encodeURIComponent(malId)}/full`, {}, { ttlMs: 86_400_000 });
  },
  getTopManga: (params = {}) => {
    const { page = 1, type, filter, limit = 20 } = params;
    const query = buildQuery({ page, type, filter, limit });
    return fetchJsonCached(`${getJikanBase()}/top/manga${query}`, {}, { ttlMs: 300_000 });
  },
};

export default jikanService;


