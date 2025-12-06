require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

// Prefer the global fetch available in Node 18+; otherwise lazily import node-fetch at runtime.
let fetchFunc = globalThis.fetch;
if (!fetchFunc) {
  fetchFunc = (...args) => import('node-fetch').then(({ default: f }) => f(...args));
}

// Allow the Vite dev server origin during development
app.use(cors({ origin: ['http://localhost:5173'] }));
app.use(express.json({ limit: '1mb' }));

const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
if (!ANTHROPIC_KEY) {
  console.warn('Warning: ANTHROPIC_API_KEY not set. Proxy will return 500 for requests.');
}

app.post('/api/anthropic', async (req, res) => {
  try {
    if (!ANTHROPIC_KEY) return res.status(500).json({ error: 'Anthropic API key not configured on server.' });

    const response = await fetchFunc('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const contentType = response.headers.get('content-type') || 'text/plain';
    const body = await response.text();

    res.status(response.status).type(contentType).send(body);
  } catch (err) {
    console.error('Anthropic proxy error:', err);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
});

// Health check / root route to avoid 404 noise from browsers/extensions
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Anthropic proxy is running' });
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Anthropic proxy listening on http://localhost:${port}`));
