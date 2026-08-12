const OCTOPUS_ORIGIN = 'https://api.octopus.energy';
const OCTOPUS_API_ROOT = `${OCTOPUS_ORIGIN}/v1`;

class UpstreamError extends Error {
  constructor(message, status = 502) {
    super(message);
    this.name = 'UpstreamError';
    this.status = status;
  }
}

const basicAuthHeader = (apiKey) =>
  `Basic ${Buffer.from(`${apiKey}:`, 'utf8').toString('base64')}`;

async function fetchJson(url, { apiKey, fetchImpl = globalThis.fetch, timeoutMs = 15000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      headers: apiKey ? { Authorization: basicAuthHeader(apiKey) } : {},
      signal: controller.signal,
    });

    if (!response.ok) {
      const status = response.status === 401 || response.status === 403 ? 401 : 502;
      throw new UpstreamError(
        status === 401
          ? 'Octopus rejected those credentials. Check the API key and account number.'
          : `Octopus returned an unexpected ${response.status} response.`,
        status,
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error.name === 'AbortError') {
      throw new UpstreamError('Octopus took too long to respond. Please try again.', 504);
    }
    console.error('[octopus] upstream connection failed', {
      code: error.cause?.code || error.code || 'UNKNOWN',
      message: error.message,
    });
    throw new UpstreamError(
      'The local server could not reach Octopus Energy. Check its network access and try again.',
      503,
    );
  } finally {
    clearTimeout(timeout);
  }
}

function currentAgreement(agreements = [], now = new Date()) {
  const timestamp = now.getTime();
  return agreements.find((agreement) => {
    const from = agreement.valid_from ? new Date(agreement.valid_from).getTime() : -Infinity;
    const to = agreement.valid_to ? new Date(agreement.valid_to).getTime() : Infinity;
    return from <= timestamp && timestamp < to;
  }) || agreements.at(-1) || null;
}

function sanitizeAccount(account) {
  const properties = (account.properties || []).map((property, index) => ({
    id: property.id,
    label: `Property ${index + 1}`,
    electricity: (property.electricity_meter_points || [])
      .filter((point) => !point.is_export)
      .map((point) => ({
        identifier: point.mpan,
        serials: (point.meters || []).map((meter) => meter.serial_number).filter(Boolean),
        tariffCode: currentAgreement(point.agreements)?.tariff_code || null,
      })),
    gas: (property.gas_meter_points || []).map((point) => ({
      identifier: point.mprn,
      serials: (point.meters || []).map((meter) => meter.serial_number).filter(Boolean),
      tariffCode: currentAgreement(point.agreements)?.tariff_code || null,
    })),
  }));

  return { number: account.number, properties };
}

async function fetchAccount({ apiKey, accountNumber, fetchImpl }) {
  const url = `${OCTOPUS_API_ROOT}/accounts/${encodeURIComponent(accountNumber)}/`;
  const account = await fetchJson(url, { apiKey, fetchImpl });
  return sanitizeAccount(account);
}

function consumptionUrl({ fuel, identifier, serial, periodFrom, periodTo }) {
  const meterPoint = fuel === 'electricity' ? 'electricity-meter-points' : 'gas-meter-points';
  const url = new URL(
    `${OCTOPUS_API_ROOT}/${meterPoint}/${encodeURIComponent(identifier)}/meters/${encodeURIComponent(serial)}/consumption/`,
  );
  url.searchParams.set('page_size', '250');
  url.searchParams.set('period_from', periodFrom);
  url.searchParams.set('period_to', periodTo);
  url.searchParams.set('order_by', 'period');
  return url;
}

async function fetchConsumption({ apiKey, meter, periodFrom, periodTo, fetchImpl }) {
  let nextUrl = consumptionUrl({ ...meter, periodFrom, periodTo });
  const results = [];
  let page = 0;

  while (nextUrl && page < 20) {
    const parsed = new URL(nextUrl);
    if (parsed.origin !== OCTOPUS_ORIGIN) {
      throw new UpstreamError('Octopus returned an invalid pagination URL.');
    }

    const payload = await fetchJson(parsed, { apiKey, fetchImpl });
    results.push(...(payload.results || []));
    nextUrl = payload.next;
    page += 1;
  }

  if (nextUrl) {
    throw new UpstreamError('The requested range returned too much data. Try a shorter period.', 400);
  }

  return results;
}

function meterRequests(account) {
  const meters = [];
  for (const property of account.properties) {
    for (const point of property.electricity) {
      for (const serial of point.serials) {
        meters.push({ fuel: 'electricity', identifier: point.identifier, serial, tariffCode: point.tariffCode });
      }
    }
    for (const point of property.gas) {
      for (const serial of point.serials) {
        meters.push({ fuel: 'gas', identifier: point.identifier, serial, tariffCode: point.tariffCode });
      }
    }
  }
  return meters.slice(0, 8);
}

function mergeIntervals(series) {
  const byStart = new Map();

  for (const interval of series.flat()) {
    const start = interval.interval_start;
    if (!start) continue;
    const existing = byStart.get(start);
    const consumption = Number(interval.consumption) || 0;
    byStart.set(start, {
      interval_start: start,
      interval_end: interval.interval_end,
      consumption: (existing?.consumption || 0) + consumption,
    });
  }

  return [...byStart.values()].sort(
    (left, right) => new Date(left.interval_start) - new Date(right.interval_start),
  );
}

async function loadDashboardRange({ apiKey, accountNumber, periodFrom, periodTo, fetchImpl }) {
  const account = await fetchAccount({ apiKey, accountNumber, fetchImpl });
  const meters = meterRequests(account);

  if (!meters.length) {
    throw new UpstreamError('No import electricity or gas meters were found on this account.', 404);
  }

  const periodFromIso = new Date(periodFrom).toISOString();
  const periodToIso = new Date(periodTo).toISOString();
  if (!(new Date(periodFromIso) < new Date(periodToIso))) {
    throw new UpstreamError('The requested date range is invalid.', 400);
  }

  const readings = await Promise.all(
    meters.map((meter) =>
      fetchConsumption({
        apiKey,
        meter,
        periodFrom: periodFromIso,
        periodTo: periodToIso,
        fetchImpl,
      }),
    ),
  );

  const electricity = mergeIntervals(
    readings.filter((_, index) => meters[index].fuel === 'electricity'),
  );
  const gas = mergeIntervals(readings.filter((_, index) => meters[index].fuel === 'gas'));

  return {
    account,
    range: { from: periodFromIso, to: periodToIso },
    meters: meters.map(({ fuel, identifier, serial, tariffCode }) => ({
      fuel,
      identifier: `${identifier.slice(0, 4)}••••${identifier.slice(-3)}`,
      serial: `••••${serial.slice(-4)}`,
      tariffCode,
    })),
    usage: { electricity, gas },
  };
}

async function loadDashboard({ apiKey, accountNumber, days, fetchImpl }) {
  const periodTo = new Date();
  const periodFrom = new Date(Date.UTC(
    periodTo.getUTCFullYear(),
    periodTo.getUTCMonth(),
    periodTo.getUTCDate() - (days - 1),
  ));
  const result = await loadDashboardRange({
    apiKey,
    accountNumber,
    periodFrom,
    periodTo,
    fetchImpl,
  });
  return { ...result, range: { ...result.range, days } };
}

module.exports = {
  UpstreamError,
  consumptionUrl,
  fetchAccount,
  fetchConsumption,
  loadDashboard,
  loadDashboardRange,
  mergeIntervals,
  sanitizeAccount,
};
