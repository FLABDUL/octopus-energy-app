const DEFAULT_OPENAI_MODEL = 'gpt-5.6-luna';
const DEFAULT_ANTHROPIC_MODEL = 'claude-sonnet-4-20250514';

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function sanitizeSummary(input = {}) {
  return {
    fuel: input.fuel === 'gas' ? 'gas' : 'electricity',
    rangeDays: Math.min(90, Math.max(1, finiteNumber(input.rangeDays, 14))),
    total: Math.max(0, finiteNumber(input.total)),
    averageDaily: Math.max(0, finiteNumber(input.averageDaily)),
    previousAverageDaily: Math.max(0, finiteNumber(input.previousAverageDaily)),
    peakInterval: Math.max(0, finiteNumber(input.peakInterval)),
    peakHour: String(input.peakHour || 'unknown').slice(0, 40),
    overnightShare: Math.min(100, Math.max(0, finiteNumber(input.overnightShare))),
    estimatedCost: Math.max(0, finiteNumber(input.estimatedCost)),
    tariffCode: String(input.tariffCode || 'not supplied').slice(0, 80),
  };
}

function buildInsightPrompt(summary) {
  const change = summary.previousAverageDaily > 0
    ? ((summary.averageDaily - summary.previousAverageDaily) / summary.previousAverageDaily) * 100
    : 0;

  return `You are a UK household energy coach. Analyse the aggregate smart-meter summary below without inventing appliance-level causes or claiming certainty.

Fuel: ${summary.fuel}
Range: ${summary.rangeDays} days
Total reported consumption: ${summary.total.toFixed(2)}
Average daily consumption: ${summary.averageDaily.toFixed(2)}
Change versus the previous comparable period: ${change.toFixed(1)}%
Highest half-hour interval: ${summary.peakInterval.toFixed(2)}
Typical peak hour: ${summary.peakHour}
Overnight share: ${summary.overnightShare.toFixed(1)}%
Estimated electricity cost, when a user-supplied rate was available: £${summary.estimatedCost.toFixed(2)}
Current tariff code: ${summary.tariffCode}

Return concise Markdown with exactly three sections: "What stands out", "Two practical actions", and "What to check next". State that gas readings may be reported in kWh or cubic metres depending on meter generation. Do not present national comparisons or savings as facts without enough tariff and household context.`;
}

function openAIText(payload) {
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  return payload.output
    ?.flatMap((item) => item.content || [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

async function generateOpenAIInsights({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  summary,
  fetchImpl = globalThis.fetch,
}) {
  const cleanSummary = sanitizeSummary(summary);
  const response = await fetchImpl('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      reasoning: { effort: 'none' },
      max_output_tokens: 700,
      input: buildInsightPrompt(cleanSummary),
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI returned ${response.status}.`);
  }

  const text = openAIText(await response.json());
  if (!text) throw new Error('OpenAI returned an empty response.');
  return text;
}

async function generateAnthropicInsights({
  apiKey,
  model = DEFAULT_ANTHROPIC_MODEL,
  summary,
  fetchImpl = globalThis.fetch,
}) {
  const cleanSummary = sanitizeSummary(summary);
  const response = await fetchImpl('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 700,
      temperature: 0.3,
      messages: [{ role: 'user', content: buildInsightPrompt(cleanSummary) }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic returned ${response.status}.`);
  }

  const payload = await response.json();
  const text = payload.content?.find((item) => item.type === 'text')?.text;
  if (!text) throw new Error('Anthropic returned an empty response.');
  return text;
}

async function generateInsights({
  openAIKey,
  openAIModel,
  anthropicKey,
  anthropicModel,
  summary,
  fetchImpl = globalThis.fetch,
}) {
  if (openAIKey) {
    try {
      const text = await generateOpenAIInsights({
        apiKey: openAIKey,
        model: openAIModel,
        summary,
        fetchImpl,
      });
      return { text, provider: 'openai', fallbackUsed: false };
    } catch (error) {
      if (!anthropicKey) throw error;
      console.warn(`OpenAI insight failed; using Anthropic fallback: ${error.message}`);
    }
  }

  if (anthropicKey) {
    const text = await generateAnthropicInsights({
      apiKey: anthropicKey,
      model: anthropicModel,
      summary,
      fetchImpl,
    });
    return { text, provider: 'anthropic', fallbackUsed: Boolean(openAIKey) };
  }

  throw new Error('No AI provider is configured.');
}

module.exports = {
  buildInsightPrompt,
  generateAnthropicInsights,
  generateInsights,
  generateOpenAIInsights,
  openAIText,
  sanitizeSummary,
};
