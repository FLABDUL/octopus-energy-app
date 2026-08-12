const path = require('node:path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const { loadDashboard, UpstreamError } = require('./octopus');
const { generateInsights } = require('./insights');
const { runMonthlyReport } = require('./monthly-report');

const DEFAULT_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
];

function allowedOrigins() {
  const configured = process.env.ALLOWED_ORIGINS
    ?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return configured?.length ? configured : DEFAULT_ORIGINS;
}

function createRateLimit({ max, windowMs }) {
  const requests = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const entry = requests.get(key);

    if (!entry || entry.resetAt <= now) {
      requests.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    if (entry.count >= max) {
      res.status(429).json({ error: 'Too many requests. Please wait a moment and try again.' });
      return;
    }

    entry.count += 1;
    next();
  };
}

function cleanAccountNumber(value) {
  const accountNumber = String(value || process.env.OCTOPUS_ACCOUNT_NUMBER || '')
    .trim()
    .toUpperCase();
  if (!/^A-[A-Z0-9]{6,16}$/.test(accountNumber)) {
    throw new UpstreamError('Enter a valid Octopus account number, such as A-1234ABCD.', 400);
  }
  return accountNumber;
}

function resolveOctopusKey(value) {
  const apiKey = String(value || process.env.OCTOPUS_API_KEY || '').trim();
  if (apiKey.length < 10 || apiKey.length > 200) {
    throw new UpstreamError('Enter a valid Octopus API key.', 400);
  }
  return apiKey;
}

function createApp({ fetchImpl = globalThis.fetch, runMonthlyReportImpl = runMonthlyReport } = {}) {
  const app = express();
  const origins = allowedOrigins();

  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      callback(null, !origin || origins.includes(origin));
    },
  }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => {
    const openAIConfigured = Boolean(process.env.OPENAI_API_KEY);
    const anthropicConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
    res.json({
      status: 'ok',
      aiAvailable: openAIConfigured || anthropicConfigured,
      aiProvider: openAIConfigured ? 'openai' : anthropicConfigured ? 'anthropic' : null,
      aiFallbackAvailable: openAIConfigured && anthropicConfigured,
      octopusConfigured: Boolean(process.env.OCTOPUS_API_KEY && process.env.OCTOPUS_ACCOUNT_NUMBER),
      monthlyReportConfigured: Boolean(
        process.env.REPORT_OCTOPUS_API_KEY
        && process.env.REPORT_OCTOPUS_ACCOUNT_NUMBER
        && process.env.RESEND_API_KEY
        && process.env.REPORT_TO_EMAIL,
      ),
    });
  });

  app.get('/api/cron/monthly-report', async (req, res, next) => {
    try {
      const cronSecret = process.env.CRON_SECRET;
      if (!cronSecret || req.headers.authorization !== `Bearer ${cronSecret}`) {
        res.status(401).json({ error: 'Unauthorized.' });
        return;
      }
      const result = await runMonthlyReportImpl({
        env: process.env,
        fetchImpl,
        testMode: req.query.test === '1',
      });
      res.json({ ok: true, ...result });
    } catch (error) {
      next(error);
    }
  });

  app.post(
    '/api/octopus/dashboard',
    createRateLimit({ max: 20, windowMs: 60_000 }),
    async (req, res, next) => {
      try {
        const days = [7, 14, 30, 60, 90].includes(Number(req.body.days))
          ? Number(req.body.days)
          : 14;
        const result = await loadDashboard({
          apiKey: resolveOctopusKey(req.body.apiKey),
          accountNumber: cleanAccountNumber(req.body.accountNumber),
          days,
          fetchImpl,
        });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    '/api/insights',
    createRateLimit({ max: 8, windowMs: 60_000 }),
    async (req, res, next) => {
      try {
        const openAIKey = process.env.OPENAI_API_KEY;
        const anthropicKey = process.env.ANTHROPIC_API_KEY;
        if (!openAIKey && !anthropicKey) {
          res.status(503).json({ error: 'AI insights are not configured on this server.' });
          return;
        }

        const result = await generateInsights({
          openAIKey,
          openAIModel: process.env.OPENAI_MODEL,
          anthropicKey,
          anthropicModel: process.env.ANTHROPIC_MODEL,
          summary: req.body.summary,
          fetchImpl,
        });
        res.json(result);
      } catch (error) {
        next(error);
      }
    },
  );

  app.use((error, _req, res, _next) => {
    const status = error.status || 500;
    if (status >= 500) console.error(error.message);
    res.status(status).json({
      error: error instanceof UpstreamError
        ? error.message
        : status >= 500
          ? 'The service could not complete that request.'
          : error.message,
    });
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3001;
  createApp().listen(port, () => {
    console.log(`Energy API listening on http://localhost:${port}`);
  });
}

module.exports = { createApp, createRateLimit };
