const londonDateKey = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/London',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const londonDayLabel = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const londonHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  hour: '2-digit',
  hour12: false,
});

const round = (value, precision = 2) => Number(value.toFixed(precision));

export function aggregateDaily(intervals = []) {
  const totals = new Map();

  for (const interval of intervals) {
    const date = new Date(interval.interval_start);
    if (Number.isNaN(date.getTime())) continue;
    const key = londonDateKey.format(date);
    const consumption = Number(interval.consumption) || 0;
    totals.set(key, (totals.get(key) || 0) + consumption);
  }

  return [...totals.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, consumption]) => ({
      date,
      label: londonDayLabel.format(new Date(`${date}T12:00:00Z`)),
      consumption: round(consumption),
    }));
}

export function hourlyProfile(intervals = []) {
  const buckets = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, count: 0 }));

  for (const interval of intervals) {
    const date = new Date(interval.interval_start);
    if (Number.isNaN(date.getTime())) continue;
    const hour = Number(londonHour.format(date)) % 24;
    buckets[hour].total += Number(interval.consumption) || 0;
    buckets[hour].count += 1;
  }

  return buckets.map((bucket) => ({
    hour: `${String(bucket.hour).padStart(2, '0')}:00`,
    consumption: bucket.count ? round(bucket.total / bucket.count, 3) : 0,
  }));
}

export function calculateAnalytics(
  intervals = [],
  { unitRatePence = 0, standingChargePence = 0 } = {},
) {
  const daily = aggregateDaily(intervals);
  const total = intervals.reduce((sum, interval) => sum + (Number(interval.consumption) || 0), 0);
  const averageDaily = daily.length ? total / daily.length : 0;
  const peakInterval = intervals.reduce((peak, interval) => {
    const consumption = Number(interval.consumption) || 0;
    return !peak || consumption > peak.consumption
      ? { consumption, at: interval.interval_start }
      : peak;
  }, null);
  const profile = hourlyProfile(intervals);
  const peakHour = profile.reduce(
    (peak, bucket) => (bucket.consumption > peak.consumption ? bucket : peak),
    { hour: '—', consumption: 0 },
  );
  const overnightTotal = intervals.reduce((sum, interval) => {
    const date = new Date(interval.interval_start);
    const hour = Number(londonHour.format(date)) % 24;
    return hour < 5 ? sum + (Number(interval.consumption) || 0) : sum;
  }, 0);

  const comparisonLength = Math.floor(daily.length / 2);
  const previousDays = daily.slice(-comparisonLength * 2, -comparisonLength || undefined);
  const currentDays = comparisonLength ? daily.slice(-comparisonLength) : daily;
  const average = (days) =>
    days.length ? days.reduce((sum, day) => sum + day.consumption, 0) / days.length : 0;
  const previousAverageDaily = average(previousDays);
  const currentAverageDaily = average(currentDays);
  const changePercent = previousAverageDaily
    ? ((currentAverageDaily - previousAverageDaily) / previousAverageDaily) * 100
    : 0;

  const hasCostRate = Number(unitRatePence) > 0;
  const estimatedCost = hasCostRate
    ? (total * Number(unitRatePence) + daily.length * Number(standingChargePence || 0)) / 100
    : null;

  return {
    total: round(total),
    averageDaily: round(averageDaily),
    previousAverageDaily: round(previousAverageDaily),
    currentAverageDaily: round(currentAverageDaily),
    changePercent: round(changePercent, 1),
    peakInterval: peakInterval
      ? { ...peakInterval, consumption: round(peakInterval.consumption, 3) }
      : { consumption: 0, at: null },
    peakHour,
    overnightShare: total ? round((overnightTotal / total) * 100, 1) : 0,
    estimatedCost: estimatedCost === null ? null : round(estimatedCost),
    daily,
    hourly: profile,
    daysWithData: daily.length,
  };
}

export function localInsightCards(analytics) {
  if (!analytics.daysWithData) return [];
  const direction = analytics.changePercent > 2 ? 'up' : analytics.changePercent < -2 ? 'down' : 'steady';

  return [
    {
      eyebrow: 'Momentum',
      title: direction === 'steady'
        ? 'Usage is holding steady'
        : `Usage is ${direction} ${Math.abs(analytics.changePercent).toFixed(0)}%`,
      description: direction === 'down'
        ? 'Your latest comparable period used less energy. Keep an eye on whether the change holds.'
        : direction === 'up'
          ? 'Your latest comparable period is higher. Check changes in occupancy, heating, or appliances.'
          : 'The latest comparable period is within 2% of the one before it.',
      tone: direction === 'up' ? 'amber' : 'teal',
    },
    {
      eyebrow: 'Peak pattern',
      title: `${analytics.peakHour.hour} is your busiest hour`,
      description: 'If your tariff varies by time, this is the first window to review for flexible loads.',
      tone: 'violet',
    },
    {
      eyebrow: 'Background load',
      title: `${analytics.overnightShare.toFixed(0)}% is used overnight`,
      description: analytics.overnightShare > 18
        ? 'A relatively large overnight share can be worth checking for always-on devices or scheduled heating.'
        : 'Your overnight share is modest; keep tracking it for unexplained changes.',
      tone: analytics.overnightShare > 18 ? 'amber' : 'blue',
    },
  ];
}

export function formatReadingDate(isoDate) {
  if (!isoDate) return 'No reading';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(isoDate));
}
