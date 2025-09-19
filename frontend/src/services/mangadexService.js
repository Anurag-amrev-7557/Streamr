import { getApiEndpoint } from '../config/api';

const getMdBase = () => {
  try { return getApiEndpoint('/mangadex'); } catch { return '/api/mangadex'; }
};

const buildQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === '') return;
    if (Array.isArray(v)) v.forEach((x) => qs.append(k, String(x))); else qs.set(k, String(v));
  });
  const s = qs.toString();
  return s ? `?${s}` : '';
};

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
    const { title, limit = 20, offset = 0, includedTags = [], availableTranslatedLanguage = ['en'], order = { relevance: 'desc' } } = params;
    const flatOrder = Object.entries(order).map(([k, v]) => [`order[${k}]`, v]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    const query = buildQuery({ title, limit, offset, availableTranslatedLanguage, ...flatOrder });
    return fetchJson(`${getMdBase()}/manga${query}`);
  },
  getManga: (id) => fetchJson(`${getMdBase()}/manga/${encodeURIComponent(id)}`),
  getMangaFeed: (id, params = {}) => {
    const { limit = 100, translatedLanguage = ['en'], order = { chapter: 'desc' } } = params;
    const flatOrder = Object.entries(order).map(([k, v]) => [`order[${k}]`, v]).reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {});
    const query = buildQuery({ limit, translatedLanguage, ...flatOrder });
    return fetchJson(`${getMdBase()}/manga/${encodeURIComponent(id)}/feed${query}`);
  },
  getChapter: (id) => fetchJson(`${getMdBase()}/chapter/${encodeURIComponent(id)}`),
  getAtHomeServer: (id, params = {}) => {
    const { forcePort443 } = params;
    const query = buildQuery({ forcePort443: forcePort443 ? 'true' : undefined });
    return fetchJson(`${getMdBase()}/at-home/server/${encodeURIComponent(id)}${query}`);
  },
};

export default mangadexService;


