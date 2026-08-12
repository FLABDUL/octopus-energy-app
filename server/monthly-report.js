const { loadDashboardRange } = require('./octopus');
const { openAIText } = require('./insights');
const { buildMonthlySummary, reportPeriods } = require('./monthly-analytics');
const { renderMonthlyEmail, sendReportEmail } = require('./report-email');

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Monthly report is missing ${name}.`);
  return value;
}

function buildCoachPrompt(summary) {
  const compact = {
    month: summary.period.label,
    electricity: summary.electricity,
    gas: summary.gas,
    tariff: summary.tariff,
  };
  return `You are Pulse, a cautious UK household energy coach. Use only the aggregate monthly statistics below. Do not guess appliances, occupancy, causes, national comparisons, or guaranteed savings. Give concise Markdown with exactly these headings: "What changed", "Three actions for next month", and "What to check". Prioritise practical ways to reduce cost and explicitly qualify uncertainty. Mention that gas units can vary by meter generation.\n\n${JSON.stringify(compact)}`;
}

async function generateMonthlyCoach({ apiKey, model = 'gpt-5.6-luna', summary, fetchImpl = globalThis.fetch }) {
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'none' },
      max_output_tokens: 900,
      input: buildCoachPrompt(summary),
    }),
  });
  if (!response.ok) throw new Error(`OpenAI returned ${response.status}.`);
  const text = openAIText(await response.json());
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
}

function fallbackCoach(summary) {
  const change = summary.electricity.changePercent;
  const trend = change === null
    ? 'There is not enough prior data for a month-on-month comparison.'
    : `Electricity usage was ${Math.abs(change).toFixed(1)}% ${change > 0 ? 'higher' : 'lower'} than the previous month.`;
  return `## What changed\n${trend}\n\n## Three actions for next month\n1. Review repeatable loads around ${summary.electricity.peakHour}, your busiest hour.\n2. Check overnight devices and schedules; ${summary.electricity.overnightShare.toFixed(1)}% of electricity was used from midnight to 06:00.\n3. Compare the configured tariff rates with your latest bill before judging savings.\n\n## What to check\nConfirm missing readings and unusual days in your smart-meter record. Gas units may be kWh or cubic metres depending on meter generation.`;
}

async function runMonthlyReport({
  env = process.env,
  now = new Date(),
  testMode = false,
  fetchImpl = globalThis.fetch,
  loadDashboardImpl = loadDashboardRange,
  sendEmailImpl = sendReportEmail,
} = {}) {
  const apiKey = required(env, 'REPORT_OCTOPUS_API_KEY');
  const accountNumber = required(env, 'REPORT_OCTOPUS_ACCOUNT_NUMBER');
  const emailApiKey = required(env, 'RESEND_API_KEY');
  const to = required(env, 'REPORT_TO_EMAIL');
  const periods = reportPeriods(now);
  const dashboard = await loadDashboardImpl({
    apiKey,
    accountNumber,
    periodFrom: periods.comparison.from,
    periodTo: periods.report.to,
    fetchImpl,
  });
  const summary = buildMonthlySummary({
    usage: dashboard.usage,
    periods,
    unitRatePence: env.REPORT_UNIT_RATE_PENCE,
    standingChargePence: env.REPORT_STANDING_CHARGE_PENCE,
  });

  let coachText;
  let aiGenerated = false;
  if (env.REPORT_OPENAI_API_KEY) {
    try {
      coachText = await generateMonthlyCoach({
        apiKey: env.REPORT_OPENAI_API_KEY,
        model: env.REPORT_OPENAI_MODEL,
        summary,
        fetchImpl,
      });
      aiGenerated = true;
    } catch (error) {
      console.warn(`Monthly AI coach failed; sending safe fallback advice: ${error.message}`);
    }
  }
  coachText ||= fallbackCoach(summary);
  const dashboardUrl = env.REPORT_DASHBOARD_URL || 'https://octopus-energy-app-psi.vercel.app';
  const message = renderMonthlyEmail({ summary, coachText, dashboardUrl });
  const subject = `${testMode ? '[Test] ' : ''}Pulse monthly report — ${summary.period.label}`;
  const idempotencyKey = testMode
    ? `pulse-test-${summary.period.key}-${now.getTime()}`
    : `pulse-monthly-${summary.period.key}`;
  const sent = await sendEmailImpl({
    apiKey: emailApiKey,
    from: env.REPORT_FROM_EMAIL || 'Pulse <onboarding@resend.dev>',
    to,
    subject,
    ...message,
    idempotencyKey,
    fetchImpl,
  });

  return { period: summary.period.key, emailId: sent.id, aiGenerated, testMode };
}

module.exports = { buildCoachPrompt, fallbackCoach, generateMonthlyCoach, runMonthlyReport };
