import { getApiEndpoint } from '../config/api';

const getMdBase = () => {
  try { return getApiEndpoint('/mangadex'); } catch { return '/api/mangadex'; }
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) {
      const key = k.endsWith('[]') ? k : `${k}[]`;
      v.forEach((x) => qs.append(key, String(x)));
    } else {
      qs.set(k, String(v));
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const fetchJson = async (url) => {
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (!res.ok) {
    const t = await res.text().catch(() => '');
    throw new Error(`MangaDex ${res.status}: ${t || res.statusText}`);
  }
  return res.json();
};

const mangadexService = {
  searchManga: (params = {}) => {
    const { title, limit = 20, offset = 0, order = { relevance: 'desc' } } = params;
    const flatOrder = Object.entries(order).map(([k, v]) => [`order[${k}]`, v]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    const query = buildQuery({ title, limit, offset, ...flatOrder });
    return fetchJson(`${getMdBase()}/manga${query}`);
  },
  getManga: (id) => fetchJson(`${getMdBase()}/manga/${encodeURIComponent(id)}`),
  getMangaFeed: (id, params = {}) => {
    const { limit = 100, translatedLanguage, order = { chapter: 'desc' }, offset = 0 } = params;
    const flatOrder = Object.entries(order).map(([k, v]) => [`order[${k}]`, v]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    const query = buildQuery({ limit, offset, ...(translatedLanguage ? { 'translatedLanguage': translatedLanguage } : {}), ...flatOrder });
    return fetchJson(`${getMdBase()}/manga/${encodeURIComponent(id)}/feed${query}`);
  },
  getChapter: (id) => fetchJson(`${getMdBase()}/chapter/${encodeURIComponent(id)}`),
  getAtHomeServer: async (id, params = {}) => {
    const tryOnce = async (force443) => {
      const query = buildQuery({ forcePort443: force443 ? 'true' : undefined });
      return fetchJson(`${getMdBase()}/at-home/server/${encodeURIComponent(id)}${query}`);
    };
    // Try force 443, then default, with one retry each if 5xx
    for (const force of [true, false]) {
      try {
        return await tryOnce(force);
      } catch (e) {
        if ((e.message || '').includes('MangaDex 5')) {
          await sleep(400);
          try { return await tryOnce(force); } catch {}
        }
        // continue to next mode
      }
    }
    // Final attempt default without force
    return tryOnce(false);
  },
  getAggregate: (mangaId, params = {}) => {
    const { translatedLanguage } = params;
    const query = buildQuery({ ...(translatedLanguage ? { 'translatedLanguage': translatedLanguage } : {}) });
    return fetchJson(`${getMdBase()}/manga/${encodeURIComponent(mangaId)}/aggregate${query}`);
  },
};

export default mangadexService;


