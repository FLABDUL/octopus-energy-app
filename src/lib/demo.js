const gaussian = (value, centre, width) => Math.exp(-((value - centre) ** 2) / (2 * width ** 2));
const rounded = (value) => Number(Math.max(0, value).toFixed(3));

export function createDemoDashboard(days = 14) {
  const now = new Date();
  now.setUTCMinutes(now.getUTCMinutes() < 30 ? 0 : 30, 0, 0);
  const start = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - (days - 1),
  ));
  const electricity = [];
  const gas = [];

  for (let index = 0; ; index += 1) {
    const intervalStart = new Date(start.getTime() + index * 30 * 60 * 1000);
    if (intervalStart >= now) break;
    const intervalEnd = new Date(intervalStart.getTime() + 30 * 60 * 1000);
    const halfHour = intervalStart.getUTCHours() + intervalStart.getUTCMinutes() / 60;
    const dayIndex = Math.floor(index / 48);
    const weekend = [0, 6].includes(intervalStart.getUTCDay());
    const texture = Math.sin(index * 1.71) * 0.025 + Math.sin(index * 0.37) * 0.018;
    const electricValue =
      0.085 +
      gaussian(halfHour, 7.5, 1.1) * 0.22 +
      gaussian(halfHour, 18.5, 1.8) * (weekend ? 0.5 : 0.62) +
      gaussian(halfHour, 13, 2.2) * (weekend ? 0.17 : 0.06) +
      texture +
      (dayIndex % 6 === 3 && halfHour > 19 && halfHour < 20 ? 0.34 : 0);
    const gasValue =
      0.02 +
      gaussian(halfHour, 6.8, 0.8) * 0.32 +
      gaussian(halfHour, 19.2, 1.1) * 0.4 +
      Math.sin(index * 0.21) * 0.012;

    electricity.push({
      interval_start: intervalStart.toISOString(),
      interval_end: intervalEnd.toISOString(),
      consumption: rounded(electricValue),
    });
    gas.push({
      interval_start: intervalStart.toISOString(),
      interval_end: intervalEnd.toISOString(),
      consumption: rounded(gasValue),
    });
  }

  return {
    demo: true,
    account: { number: 'DEMO', properties: [{ id: 'demo', label: 'Sample home' }] },
    range: { from: start.toISOString(), to: now.toISOString(), days },
    meters: [
      {
        fuel: 'electricity',
        identifier: '1200••••001',
        serial: '••••2048',
        tariffCode: 'ILLUSTRATIVE-FLEX',
      },
      {
        fuel: 'gas',
        identifier: '9182••••721',
        serial: '••••1184',
        tariffCode: 'ILLUSTRATIVE-GAS',
      },
    ],
    usage: { electricity, gas },
  };
}
