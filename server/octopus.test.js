const test = require('node:test');
const assert = require('node:assert/strict');
const {
  consumptionUrl,
  fetchConsumption,
  mergeIntervals,
  sanitizeAccount,
} = require('./octopus');

test('sanitizeAccount returns meter data without address details', () => {
  const account = sanitizeAccount({
    number: 'A-1234ABCD',
    properties: [{
      id: 7,
      address_line_1: 'Private address',
      electricity_meter_points: [{
        mpan: '1200000000000',
        is_export: false,
        meters: [{ serial_number: 'ELECTRIC-1' }],
        agreements: [{ tariff_code: 'E-TEST', valid_from: '2020-01-01', valid_to: null }],
      }],
      gas_meter_points: [],
    }],
  });

  assert.equal(account.properties[0].electricity[0].identifier, '1200000000000');
  assert.equal(account.properties[0].electricity[0].tariffCode, 'E-TEST');
  assert.equal('address_line_1' in account.properties[0], false);
});

test('consumptionUrl includes explicit UTC range and ordering', () => {
  const url = consumptionUrl({
    fuel: 'electricity',
    identifier: '1200000000000',
    serial: 'SERIAL',
    periodFrom: '2026-01-01T00:00:00.000Z',
    periodTo: '2026-01-02T00:00:00.000Z',
  });

  assert.equal(url.searchParams.get('order_by'), 'period');
  assert.equal(url.searchParams.get('period_from'), '2026-01-01T00:00:00.000Z');
  assert.equal(url.searchParams.get('page_size'), '250');
});

test('fetchConsumption follows trusted Octopus pagination', async () => {
  const pages = [
    { results: [{ interval_start: '2026-01-01T00:00:00Z', consumption: 1 }], next: 'https://api.octopus.energy/v1/next-page' },
    { results: [{ interval_start: '2026-01-01T00:30:00Z', consumption: 2 }], next: null },
  ];
  const fetchImpl = async () => ({ ok: true, status: 200, json: async () => pages.shift() });

  const readings = await fetchConsumption({
    apiKey: 'secret-key-value',
    meter: { fuel: 'electricity', identifier: '1200000000000', serial: 'SERIAL' },
    periodFrom: '2026-01-01T00:00:00.000Z',
    periodTo: '2026-01-02T00:00:00.000Z',
    fetchImpl,
  });

  assert.deepEqual(readings.map((reading) => reading.consumption), [1, 2]);
});

test('mergeIntervals sums matching timestamps from multiple meters', () => {
  const merged = mergeIntervals([
    [{ interval_start: '2026-01-01T00:00:00Z', interval_end: '2026-01-01T00:30:00Z', consumption: 1 }],
    [{ interval_start: '2026-01-01T00:00:00Z', interval_end: '2026-01-01T00:30:00Z', consumption: 2 }],
  ]);
  assert.equal(merged[0].consumption, 3);
});
