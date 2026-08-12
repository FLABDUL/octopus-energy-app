const REPORT_TIME_ZONE = 'Europe/London';

const round = (value, places = 2) => Number(value.toFixed(places));

function localParts(date, timeZone = REPORT_TIME_ZONE) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
}

function zonedMidnightUtc({ year, month, day }, timeZone = REPORT_TIME_ZONE) {
  const desired = Date.UTC(year, month - 1, day);
  let guess = desired;
  for (let index = 0; index < 3; index += 1) {
    const parts = localParts(new Date(guess), timeZone);
    const actual = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour));
    guess += desired - actual;
  }
  return new Date(guess);
}

function shiftMonth({ year, month }, offset) {
  const shifted = new Date(Date.UTC(year, month - 1 + offset, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: 1 };
}

function monthLabel({ year, month }) {
  return new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(year, month - 1, 1)));
}

function daysInMonth({ year, month }) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function reportPeriods(now = new Date(), timeZone = REPORT_TIME_ZONE) {
  const current = localParts(now, timeZone);
  const currentMonth = { year: Number(current.year), month: Number(current.month), day: 1 };
  const reportMonth = shiftMonth(currentMonth, -1);
  const comparisonMonth = shiftMonth(currentMonth, -2);

  const makePeriod = (month, nextMonth) => ({
    key: `${month.year}-${String(month.month).padStart(2, '0')}`,
    label: monthLabel(month),
    from: zonedMidnightUtc(month, timeZone).toISOString(),
    to: zonedMidnightUtc(nextMonth, timeZone).toISOString(),
    days: daysInMonth(month),
  });

  return {
    report: makePeriod(reportMonth, currentMonth),
    comparison: makePeriod(comparisonMonth, reportMonth),
    timeZone,
  };
}

function calculateFuelSummary(intervals = [], period, timeZone = REPORT_TIME_ZONE) {
  const from = new Date(period.from).getTime();
  const to = new Date(period.to).getTime();
  const readings = intervals.filter((item) => {
    const timestamp = new Date(item.interval_start).getTime();
    return Number.isFinite(timestamp) && timestamp >= from && timestamp < to;
  });
  const daily = new Map();
  const hourly = Array.from({ length: 24 }, () => 0);
  let total = 0;
  let overnight = 0;
  let peakInterval = { value: 0, at: null };

  for (const reading of readings) {
    const value = Math.max(0, Number(reading.consumption) || 0);
    const parts = localParts(new Date(reading.interval_start), timeZone);
    const dateKey = `${parts.year}-${parts.month}-${parts.day}`;
    const hour = Number(parts.hour);
    total += value;
    daily.set(dateKey, (daily.get(dateKey) || 0) + value);
    hourly[hour] += value;
    if (hour < 6) overnight += value;
    if (value > peakInterval.value) peakInterval = { value, at: reading.interval_start };
  }

  const peakHour = hourly.indexOf(Math.max(...hourly));
  const topDays = [...daily.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([date, value]) => ({ date, value: round(value) }));

  return {
    total: round(total),
    averageDaily: round(total / period.days),
    daysWithData: daily.size,
    coveragePercent: round((daily.size / period.days) * 100, 1),
    readingCount: readings.length,
    peakInterval: round(peakInterval.value, 3),
    peakIntervalAt: peakInterval.at,
    peakHour: `${String(peakHour).padStart(2, '0')}:00`,
    overnightShare: total ? round((overnight / total) * 100, 1) : 0,
    topDays,
  };
}

function percentChange(current, previous) {
  if (!previous) return null;
  return round(((current - previous) / previous) * 100, 1);
}

function buildMonthlySummary({ usage, periods, unitRatePence, standingChargePence }) {
  const summarize = (fuel) => {
    const current = calculateFuelSummary(usage[fuel], periods.report, periods.timeZone);
    const previous = calculateFuelSummary(usage[fuel], periods.comparison, periods.timeZone);
    return {
      ...current,
      previousTotal: previous.total,
      changePercent: percentChange(current.total, previous.total),
    };
  };
  const electricity = summarize('electricity');
  const gas = summarize('gas');
  const rate = Math.max(0, Number(unitRatePence) || 0);
  const standing = Math.max(0, Number(standingChargePence) || 0);
  electricity.estimatedCost = round((electricity.total * rate + periods.report.days * standing) / 100);

  return {
    period: periods.report,
    comparisonPeriod: periods.comparison,
    electricity,
    gas,
    tariff: { unitRatePence: rate, standingChargePence: standing },
  };
}

module.exports = {
  REPORT_TIME_ZONE,
  buildMonthlySummary,
  calculateFuelSummary,
  percentChange,
  reportPeriods,
  zonedMidnightUtc,
};
