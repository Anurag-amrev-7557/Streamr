const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// MangaDex API base
const BASE = 'https://api.mangadex.org';

// Health
router.get('/ping', (req, res) => {
	res.json({ status: 'ok', route: 'mangadex', timestamp: new Date().toISOString() });
});

// Proxy GET requests to MangaDex API
router.get('/*', async (req, res) => {
	try {
		const relativePath = req.params[0] ? `/${req.params[0]}` : req.path;
		const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
		const targetUrl = `${BASE}${relativePath}${query}`;
		let upstream = await fetch(targetUrl, {
			method: 'GET',
			headers: {
				'accept': 'application/json',
				'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)'
			}
		});
		const contentType = upstream.headers.get('content-type') || '';
		if (!contentType.toLowerCase().includes('application/json')) {
			const text = await upstream.text();
			return res.status(upstream.status || 502).json({
				error: 'Upstream returned non-JSON',
				status: upstream.status,
				contentType,
				preview: String(text).slice(0, 200)
			});
		}
		res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
		if (process.env.NODE_ENV === 'production') {
			res.setHeader('Cache-Control', 'public, max-age=60');
		} else {
			res.setHeader('Cache-Control', 'no-cache');
		}
		if (!upstream.ok) {
			const text = await upstream.text();
			return res.status(upstream.status).send(text);
		}
		const body = await upstream.text();
		return res.status(200).send(body);
	} catch (error) {
		console.error('MangaDex proxy error:', error);
		return res.status(502).json({ error: 'Bad Gateway', message: 'Failed to fetch from MangaDex API' });
	}
});

module.exports = router;


