const express = require('express');
const router = express.Router();
const { fetch } = require('undici');

// MangaDex base
const MANGADEX_BASE = 'https://api.mangadex.org';

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', route: 'mangadex', timestamp: new Date().toISOString() });
});

// Generic GET proxy for public endpoints
router.get('/*', async (req, res) => {
  try {
    const relativePath = req.params[0] ? `/${req.params[0]}` : req.path;
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const url = `${MANGADEX_BASE}${relativePath}${query}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)'
      }
    });

    const contentType = upstream.headers.get('content-type') || '';
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
  } catch (err) {
    console.error('MangaDex proxy error:', err);
    return res.status(502).json({ error: 'Bad Gateway', message: 'Failed to fetch from MangaDex API' });
  }
});

module.exports = router;


