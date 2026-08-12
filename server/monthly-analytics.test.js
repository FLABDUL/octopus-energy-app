const test = require('node:test');
const assert = require('node:assert/strict');
const { buildMonthlySummary, reportPeriods } = require('./monthly-analytics');

test('reportPeriods returns complete London months across British Summer Time', () => {
  const periods = reportPeriods(new Date('2026-08-12T12:00:00Z'));
  assert.deepEqual(periods.report, {
    key: '2026-07',
    label: 'July 2026',
    from: '2026-06-30T23:00:00.000Z',
    to: '2026-07-31T23:00:00.000Z',
    days: 31,
  });
  assert.equal(periods.comparison.key, '2026-06');
  assert.equal(periods.comparison.from, '2026-05-31T23:00:00.000Z');
});

test('buildMonthlySummary calculates trends, patterns, coverage and tariff cost', () => {
  const periods = reportPeriods(new Date('2026-08-12T12:00:00Z'));
  const usage = {
    electricity: [
      { interval_start: '2026-06-10T07:00:00Z', consumption: 2 },
      { interval_start: '2026-07-01T00:00:00Z', consumption: 3 },
      { interval_start: '2026-07-02T07:00:00Z', consumption: 7 },
    ],
    gas: [],
  };
  const summary = buildMonthlySummary({
    usage,
    periods,
    unitRatePence: 25.85,
    standingChargePence: 60.89,
  });

  assert.equal(summary.electricity.total, 10);
  assert.equal(summary.electricity.previousTotal, 2);
  assert.equal(summary.electricity.changePercent, 400);
  assert.equal(summary.electricity.peakHour, '08:00');
  assert.equal(summary.electricity.topDays[0].value, 7);
  assert.equal(summary.electricity.estimatedCost, 21.46);
});
