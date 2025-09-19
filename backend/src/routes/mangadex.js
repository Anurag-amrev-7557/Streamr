const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

// MangaDex API base
const BASE = 'https://api.mangadex.org';
const UPLOADS = 'https://uploads.mangadex.org';

// Health
router.get('/ping', (req, res) => {
	res.json({ status: 'ok', route: 'mangadex', timestamp: new Date().toISOString() });
});

// Proxy cover images to avoid client-side TLS/CDN issues
router.get('/cover/:mangaId/:fileName', async (req, res) => {
    try {
        const { mangaId, fileName } = req.params;
        const sizeParam = String(req.query.s || '256');
        const safeSize = ['256', '512', 'orig'].includes(sizeParam) ? sizeParam : '256';
        const suffix = safeSize === 'orig' ? '' : `.${safeSize}.jpg`;
        const url = `${UPLOADS}/covers/${encodeURIComponent(mangaId)}/${encodeURIComponent(fileName)}${suffix}`;
        const upstream = await fetch(url, {
            method: 'GET',
            headers: {
                'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)',
                'accept': 'image/*'
            }
        });
        if (!upstream.ok) {
            const buf = await upstream.arrayBuffer().catch(() => null);
            return res.status(upstream.status).send(Buffer.from(buf || ''));
        }
        res.setHeader('Cache-Control', process.env.NODE_ENV === 'production' ? 'public, max-age=3600' : 'no-cache');
        res.setHeader('Content-Type', upstream.headers.get('content-type') || 'image/jpeg');
        const body = await upstream.arrayBuffer();
        return res.status(200).send(Buffer.from(body));
    } catch (err) {
        console.error('MangaDex cover proxy error:', err);
        return res.status(502).send('Bad Gateway');
    }
});

// Proxy GET requests to MangaDex API (keep after specific routes)
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


