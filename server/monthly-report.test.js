const test = require('node:test');
const assert = require('node:assert/strict');
const { buildCoachPrompt, runMonthlyReport } = require('./monthly-report');

function reportEnv() {
  return {
    REPORT_OCTOPUS_API_KEY: 'octopus-secret',
    REPORT_OCTOPUS_ACCOUNT_NUMBER: 'A-1234ABCD',
    REPORT_OPENAI_API_KEY: 'openai-secret',
    RESEND_API_KEY: 'resend-secret',
    REPORT_TO_EMAIL: 'owner@example.com',
    REPORT_UNIT_RATE_PENCE: '25.85',
    REPORT_STANDING_CHARGE_PENCE: '60.89',
  };
}

test('buildCoachPrompt contains aggregate values but no account or meter identifiers', () => {
  const prompt = buildCoachPrompt({
    period: { label: 'July 2026' },
    electricity: { total: 20 },
    gas: { total: 3 },
    tariff: { unitRatePence: 25.85 },
  });
  assert.match(prompt, /"total":20/);
  assert.doesNotMatch(prompt, /account|meter identifier/i);
});

test('runMonthlyReport loads two complete months and sends an AI-enhanced test email', async () => {
  let loaded;
  let email;
  const result = await runMonthlyReport({
    env: reportEnv(),
    now: new Date('2026-08-12T12:00:00Z'),
    testMode: true,
    loadDashboardImpl: async (input) => {
      loaded = input;
      return { usage: { electricity: [], gas: [] } };
    },
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({ output_text: '## What changed\nStable usage.' }),
    }),
    sendEmailImpl: async (input) => {
      email = input;
      return { id: 'sent-1' };
    },
  });

  assert.equal(loaded.periodFrom, '2026-05-31T23:00:00.000Z');
  assert.equal(loaded.periodTo, '2026-07-31T23:00:00.000Z');
  assert.match(email.subject, /^\[Test\]/);
  assert.equal(email.to, 'owner@example.com');
  assert.equal(result.aiGenerated, true);
});

test('runMonthlyReport still sends safe recommendations when OpenAI fails', async () => {
  let email;
  const result = await runMonthlyReport({
    env: reportEnv(),
    now: new Date('2026-08-12T12:00:00Z'),
    loadDashboardImpl: async () => ({ usage: { electricity: [], gas: [] } }),
    fetchImpl: async () => ({ ok: false, status: 500 }),
    sendEmailImpl: async (input) => {
      email = input;
      return { id: 'sent-2' };
    },
  });
  assert.equal(result.aiGenerated, false);
  assert.match(email.text, /Three actions for next month/);
});
