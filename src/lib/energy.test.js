import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateDaily, calculateAnalytics, hourlyProfile } from './energy.js';
import { createDemoDashboard } from './demo.js';

const interval = (start, consumption) => ({
  interval_start: start,
  interval_end: new Date(new Date(start).getTime() + 30 * 60 * 1000).toISOString(),
  consumption,
});

test('aggregateDaily groups half-hourly readings into London calendar days', () => {
  const daily = aggregateDaily([
    interval('2026-01-10T12:00:00Z', 0.4),
    interval('2026-01-10T12:30:00Z', 0.6),
    interval('2026-01-11T12:00:00Z', 1.5),
  ]);

  assert.deepEqual(daily.map(({ date, consumption }) => ({ date, consumption })), [
    { date: '2026-01-10', consumption: 1 },
    { date: '2026-01-11', consumption: 1.5 },
  ]);
});

test('calculateAnalytics reports a daily average rather than an interval average', () => {
  const analytics = calculateAnalytics([
    interval('2026-01-10T12:00:00Z', 1),
    interval('2026-01-10T12:30:00Z', 1),
    interval('2026-01-11T12:00:00Z', 4),
  ]);

  assert.equal(analytics.total, 6);
  assert.equal(analytics.averageDaily, 3);
  assert.equal(analytics.daysWithData, 2);
});

test('hourlyProfile averages readings within each London hour', () => {
  const profile = hourlyProfile([
    interval('2026-01-10T08:00:00Z', 0.2),
    interval('2026-01-10T08:30:00Z', 0.4),
  ]);

  assert.equal(profile[8].hour, '08:00');
  assert.equal(profile[8].consumption, 0.3);
});

test('demo data supplies complete half-hourly electricity and gas series', () => {
  const demo = createDemoDashboard(7);
  assert.ok(demo.usage.electricity.length > 6 * 48);
  assert.ok(demo.usage.electricity.length <= 7 * 48);
  assert.equal(demo.usage.gas.length, demo.usage.electricity.length);
  assert.equal(demo.range.days, 7);
});
