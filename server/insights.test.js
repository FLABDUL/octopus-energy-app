const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildInsightPrompt,
  generateInsights,
  generateOpenAIInsights,
  sanitizeSummary,
} = require('./insights');

test('sanitizeSummary constrains untrusted client fields', () => {
  const summary = sanitizeSummary({
    fuel: 'unexpected',
    rangeDays: 500,
    total: -10,
    peakHour: 'x'.repeat(200),
  });

  assert.equal(summary.fuel, 'electricity');
  assert.equal(summary.rangeDays, 90);
  assert.equal(summary.total, 0);
  assert.equal(summary.peakHour.length, 40);
});

test('buildInsightPrompt asks for qualified, non-speculative advice', () => {
  const prompt = buildInsightPrompt(sanitizeSummary({ total: 12, averageDaily: 3 }));
  assert.match(prompt, /without inventing appliance-level causes/i);
  assert.match(prompt, /exactly three sections/i);
});

test('generateOpenAIInsights uses the Responses API without exposing raw readings', async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      json: async () => ({
        output: [{ content: [{ type: 'output_text', text: 'Useful summary' }] }],
      }),
    };
  };

  const text = await generateOpenAIInsights({
    apiKey: 'openai-test-key',
    summary: { total: 12, rawReadings: [{ consumption: 99 }] },
    fetchImpl,
  });

  assert.equal(text, 'Useful summary');
  assert.equal(request.url, 'https://api.openai.com/v1/responses');
  assert.equal(request.options.headers.Authorization, 'Bearer openai-test-key');
  assert.equal(JSON.parse(request.options.body).reasoning.effort, 'none');
  assert.doesNotMatch(request.options.body, /rawReadings|99/);
});

test('generateInsights falls back to Anthropic when OpenAI fails', async () => {
  const requestedUrls = [];
  const fetchImpl = async (url) => {
    requestedUrls.push(url);
    if (url.includes('openai.com')) return { ok: false, status: 503 };
    return {
      ok: true,
      json: async () => ({ content: [{ type: 'text', text: 'Fallback summary' }] }),
    };
  };

  const result = await generateInsights({
    openAIKey: 'openai-test-key',
    anthropicKey: 'anthropic-test-key',
    summary: {},
    fetchImpl,
  });

  assert.deepEqual(requestedUrls, [
    'https://api.openai.com/v1/responses',
    'https://api.anthropic.com/v1/messages',
  ]);
  assert.deepEqual(result, {
    text: 'Fallback summary',
    provider: 'anthropic',
    fallbackUsed: true,
  });
});
