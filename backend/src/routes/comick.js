const express = require('express');
const router = express.Router();
const { fetch } = require('undici');

// Base URL for Comick API
const PRIMARY_BASE = 'https://api.comick.fun';
const FALLBACK_BASE = 'https://api.comick.cc';

// Simple health check for route mounting
router.get('/ping', (req, res) => {
  res.json({ status: 'ok', route: 'comick', timestamp: new Date().toISOString() });
});

// Proxy all GET requests to Comick API
router.get('/*', async (req, res) => {
  try {
    // Preserve only the path relative to this router and the query string
    const relativePath = req.params[0] ? `/${req.params[0]}` : req.path;
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const targetUrlPrimary = `${PRIMARY_BASE}${relativePath}${query}`;
    const targetUrlFallback = `${FALLBACK_BASE}${relativePath}${query}`;

    console.debug('[Comick Proxy] →', targetUrlPrimary);

    let upstream = await fetch(targetUrlPrimary, {
      method: 'GET',
      headers: {
        // Ensure JSON response
        'accept': 'application/json',
        'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)'
      },
      // Reasonable timeout via AbortController pattern
      // Note: undici supports timeout option on Node 20 via AbortController externally if needed
    });

    let contentType = upstream.headers.get('content-type') || '';
    // Force JSON downstream if upstream isn't JSON to avoid frontend parse errors
    if (!contentType.toLowerCase().includes('application/json')) {
      // Try fallback domain
      console.warn('[Comick Proxy] Non-JSON from primary, trying fallback →', targetUrlFallback);
      upstream = await fetch(targetUrlFallback, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'user-agent': 'Streamr/1.0 (+https://streamr-see.web.app)'
        },
      });
      contentType = upstream.headers.get('content-type') || '';
      if (!contentType.toLowerCase().includes('application/json')) {
        const text = await upstream.text();
        return res.status(upstream.status || 502).json({
          error: 'Upstream returned non-JSON (primary and fallback)',
          status: upstream.status,
          contentType,
          preview: String(text).slice(0, 200)
        });
      }
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
    console.error('Comick proxy error:', error);
    return res.status(502).json({ error: 'Bad Gateway', message: 'Failed to fetch from Comick API' });
  }
});

module.exports = router;


