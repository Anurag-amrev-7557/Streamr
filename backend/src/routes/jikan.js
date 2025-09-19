const express = require('express');
const router = express.Router();
const { fetch } = require('undici');

// Jikan v4 base
const JIKAN_BASE = 'https://api.jikan.moe/v4';

router.get('/ping', (req, res) => {
  res.json({ status: 'ok', route: 'jikan', timestamp: new Date().toISOString() });
});

// Proxy GET to Jikan, preserve path/query after /api/jikan
router.get('/*', async (req, res) => {
  try {
    const relativePath = req.params[0] ? `/${req.params[0]}` : req.path;
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const url = `${JIKAN_BASE}${relativePath}${query}`;

    const upstream = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)'
      }
    });

    const contentType = upstream.headers.get('content-type') || '';
    res.setHeader('Content-Type', contentType || 'application/json; charset=utf-8');
    // Expose caching headers for frontend awareness
    const expose = ['etag', 'expires', 'last-modified', 'x-request-fingerprint'];
    res.setHeader('Access-Control-Expose-Headers', expose.join(', '));
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
    console.error('Jikan proxy error:', err);
    return res.status(502).json({ error: 'Bad Gateway', message: 'Failed to fetch from Jikan API' });
  }
});

module.exports = router;


