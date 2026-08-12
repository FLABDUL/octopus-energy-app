const RESEND_ENDPOINT = 'https://api.resend.com/emails';

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function coachToHtml(text) {
  return escapeHtml(text)
    .replace(/^###? (.+)$/gm, '<h3 style="margin:22px 0 8px;color:#111827;font-size:17px">$1</h3>')
    .replace(/^\d+\. (.+)$/gm, '<p style="margin:8px 0"><strong>•</strong> $1</p>')
    .replace(/^- (.+)$/gm, '<p style="margin:8px 0"><strong>•</strong> $1</p>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

function formatChange(value) {
  if (value === null) return 'No comparison available';
  return `${value > 0 ? '↑ ' : value < 0 ? '↓ ' : ''}${Math.abs(value).toFixed(1)}% vs previous month`;
}

function renderMonthlyEmail({ summary, coachText, dashboardUrl }) {
  const { electricity, gas, period, tariff } = summary;
  const topDays = electricity.topDays.length
    ? electricity.topDays.map((day) => `<li>${escapeHtml(day.date)} — ${day.value.toFixed(2)} kWh</li>`).join('')
    : '<li>No electricity readings received.</li>';
  const gasBlock = gas.readingCount
    ? `<td style="padding:14px;width:50%"><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Gas usage</div><div style="font-size:28px;font-weight:700">${gas.total.toFixed(2)}</div><div style="color:#64748b;font-size:13px">${formatChange(gas.changePercent)} · units as reported by Octopus</div></td>`
    : '<td style="padding:14px;width:50%"><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Gas usage</div><div style="font-size:18px;font-weight:700">No readings</div></td>';

  const html = `<!doctype html><html><body style="margin:0;background:#f1f5f9;font-family:Arial,sans-serif;color:#0f172a"><div style="display:none">Your ${escapeHtml(period.label)} energy summary and practical cost-saving actions.</div><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center" style="padding:28px 12px"><table role="presentation" width="100%" style="max-width:680px;background:white;border-radius:20px;overflow:hidden"><tr><td style="padding:30px;background:#111c38;color:white"><div style="color:#d946ef;font-size:12px;font-weight:700;letter-spacing:.16em">PULSE · MONTHLY ENERGY INTELLIGENCE</div><h1 style="margin:10px 0 4px;font-size:30px">${escapeHtml(period.label)}</h1><div style="color:#cbd5e1">Your complete monthly usage summary</div></td></tr><tr><td style="padding:18px 22px"><table role="presentation" width="100%"><tr><td style="padding:14px;width:50%"><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Electricity</div><div style="font-size:28px;font-weight:700">${electricity.total.toFixed(2)} kWh</div><div style="color:#64748b;font-size:13px">${formatChange(electricity.changePercent)}</div></td><td style="padding:14px;width:50%"><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Estimated cost</div><div style="font-size:28px;font-weight:700">£${electricity.estimatedCost.toFixed(2)}</div><div style="color:#64748b;font-size:13px">Using your configured rates</div></td></tr><tr>${gasBlock}<td style="padding:14px;width:50%"><div style="color:#64748b;font-size:12px;text-transform:uppercase;letter-spacing:.08em">Daily average</div><div style="font-size:28px;font-weight:700">${electricity.averageDaily.toFixed(2)} kWh</div><div style="color:#64748b;font-size:13px">${electricity.coveragePercent.toFixed(1)}% day coverage</div></td></tr></table><hr style="border:0;border-top:1px solid #e2e8f0;margin:14px 0"><h2 style="font-size:21px">Usage patterns</h2><p><strong>Busiest hour:</strong> ${escapeHtml(electricity.peakHour)} · <strong>highest half-hour:</strong> ${electricity.peakInterval.toFixed(3)} kWh · <strong>overnight share:</strong> ${electricity.overnightShare.toFixed(1)}%</p><h3 style="font-size:17px">Highest-use days</h3><ol style="line-height:1.8;padding-left:22px">${topDays}</ol><div style="margin:24px 0;padding:22px;background:#f5f3ff;border-radius:14px"><div style="color:#7c3aed;font-size:12px;font-weight:700;letter-spacing:.12em">AI COACH</div>${coachToHtml(coachText)}</div><p style="color:#64748b;font-size:13px">Cost assumes ${tariff.unitRatePence.toFixed(2)}p/kWh plus ${tariff.standingChargePence.toFixed(2)}p/day. Gas units are shown as reported by Octopus and are not costed.</p><p style="text-align:center;margin:26px"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:700">Open Pulse dashboard</a></p></td></tr><tr><td style="padding:20px 28px;background:#f8fafc;color:#64748b;font-size:12px">Pulse sends only aggregate statistics to OpenAI. Your Octopus key, account number, meter identifiers, and raw readings are never included in the AI request.</td></tr></table></td></tr></table></body></html>`;

  const text = `Pulse monthly report — ${period.label}\n\nElectricity: ${electricity.total.toFixed(2)} kWh (${formatChange(electricity.changePercent)})\nEstimated cost: £${electricity.estimatedCost.toFixed(2)}\nDaily average: ${electricity.averageDaily.toFixed(2)} kWh\nBusiest hour: ${electricity.peakHour}\nOvernight share: ${electricity.overnightShare.toFixed(1)}%\nGas: ${gas.readingCount ? gas.total.toFixed(2) : 'No readings'}\n\nAI coach\n${coachText}\n\nCost assumptions: ${tariff.unitRatePence.toFixed(2)}p/kWh + ${tariff.standingChargePence.toFixed(2)}p/day.\n${dashboardUrl}`;
  return { html, text };
}

async function sendReportEmail({ apiKey, from, to, subject, html, text, idempotencyKey, fetchImpl = globalThis.fetch }) {
  const response = await fetchImpl(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`Email provider returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ''}.`);
  }
  return response.json();
}

module.exports = { escapeHtml, renderMonthlyEmail, sendReportEmail };
