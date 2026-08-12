const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./index');

test('monthly cron requires Vercel cron authorization', async () => {
  const previous = process.env.CRON_SECRET;
  process.env.CRON_SECRET = 'cron-test-secret';
  const app = createApp({ runMonthlyReportImpl: async () => ({ emailId: 'sent' }) });
  const server = app.listen(0);
  try {
    const { port } = server.address();
    const unauthorized = await fetch(`http://127.0.0.1:${port}/api/cron/monthly-report`);
    assert.equal(unauthorized.status, 401);
    const authorized = await fetch(`http://127.0.0.1:${port}/api/cron/monthly-report`, {
      headers: { Authorization: 'Bearer cron-test-secret' },
    });
    assert.equal(authorized.status, 200);
    assert.equal((await authorized.json()).emailId, 'sent');
  } finally {
    server.close();
    if (previous === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = previous;
  }
});
