const test = require('node:test');
const assert = require('node:assert/strict');
const { renderMonthlyEmail, sendReportEmail } = require('./report-email');

const summary = {
  period: { label: 'July 2026' },
  electricity: {
    total: 100,
    changePercent: -10,
    estimatedCost: 44,
    averageDaily: 3.23,
    coveragePercent: 100,
    peakHour: '08:00',
    peakInterval: 1.25,
    overnightShare: 12,
    topDays: [{ date: '2026-07-10', value: 5 }],
  },
  gas: { readingCount: 0, total: 0, changePercent: null },
  tariff: { unitRatePence: 25.85, standingChargePence: 60.89 },
};

test('renderMonthlyEmail includes the complete summary and escapes coach content', () => {
  const result = renderMonthlyEmail({
    summary,
    coachText: '## What changed\n<script>alert(1)</script>',
    dashboardUrl: 'https://example.com',
  });
  assert.match(result.html, /100\.00 kWh/);
  assert.match(result.html, /£44\.00/);
  assert.match(result.html, /25\.85p\/kWh/);
  assert.doesNotMatch(result.html, /<script>/);
  assert.match(result.html, /&lt;script&gt;/);
});

test('sendReportEmail sends a deterministic idempotency key to Resend', async () => {
  let request;
  const result = await sendReportEmail({
    apiKey: 're_test',
    from: 'Pulse <pulse@example.com>',
    to: 'owner@example.com',
    subject: 'Monthly report',
    html: '<p>Report</p>',
    text: 'Report',
    idempotencyKey: 'pulse-monthly-2026-07',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ id: 'email-1' }) };
    },
  });
  assert.equal(result.id, 'email-1');
  assert.equal(request.options.headers['Idempotency-Key'], 'pulse-monthly-2026-07');
  assert.deepEqual(JSON.parse(request.options.body).to, ['owner@example.com']);
});
