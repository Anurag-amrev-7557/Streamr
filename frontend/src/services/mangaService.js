// Manga service switcher: choose between Comick and MangaDex via feature flag
import comickService from './comickService';
import mangadexService from './mangadexService';

const getFlag = (name, def = 'mangadex') => {
	try {
		const v = (import.meta?.env?.[name] || process.env?.[name] || '').toString();
		return v || def;
	} catch {
		return def;
	}
};

const provider = (getFlag('VITE_MANGA_PROVIDER', 'comick') || 'comick').toLowerCase();

const service = provider === 'mangadex' ? mangadexService : comickService;

export default service;


