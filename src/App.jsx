import { useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bot,
  Check,
  ChevronDown,
  CircleGauge,
  Clock3,
  Flame,
  Info,
  KeyRound,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { calculateAnalytics, formatReadingDate, localInsightCards } from './lib/energy';
import { createDemoDashboard } from './lib/demo';

const DAY_OPTIONS = [7, 14, 30, 60, 90];
const EMPTY_READINGS = [];

const numberFormatter = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 2 });
const currencyFormatter = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
});

function Brand({ compact = false }) {
  return (
    <div className="flex items-center gap-3">
      <div className="grid size-10 place-items-center rounded-2xl bg-gradient-to-br from-fuchsia-500 to-violet-600 text-white shadow-lg shadow-fuchsia-500/20">
        <Zap size={21} fill="currentColor" aria-hidden="true" />
      </div>
      {!compact && (
        <div>
          <p className="font-display text-lg font-semibold tracking-tight text-slate-950">Pulse</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Energy intelligence
          </p>
        </div>
      )}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm font-semibold text-slate-800">
        {label}
        {hint && <span className="text-xs font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function ConnectionView({
  credentials,
  setCredentials,
  days,
  setDays,
  loading,
  error,
  health,
  onConnect,
  onDemo,
}) {
  const canUseServerConfig = health?.octopusConfigured;
  const complete = canUseServerConfig || (credentials.apiKey && credentials.accountNumber);

  return (
    <main className="min-h-screen overflow-hidden bg-[#07111f] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-70" aria-hidden="true">
        <div className="absolute -left-44 top-10 size-[32rem] rounded-full bg-fuchsia-600/20 blur-[120px]" />
        <div className="absolute -right-32 bottom-0 size-[36rem] rounded-full bg-cyan-500/15 blur-[140px]" />
        <div className="energy-grid absolute inset-0" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="flex flex-col px-6 py-7 sm:px-10 lg:px-16 lg:py-10 xl:px-24">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-white text-fuchsia-600">
                <Zap size={22} fill="currentColor" aria-hidden="true" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold">Pulse</p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                  Energy intelligence
                </p>
              </div>
            </div>
            <span className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300 sm:flex">
              <ShieldCheck size={14} className="text-emerald-400" aria-hidden="true" />
              Privacy-first
            </span>
          </div>

          <div className="my-auto max-w-2xl py-16 lg:py-24">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-400/10 px-3.5 py-2 text-xs font-semibold text-fuchsia-200">
              <Sparkles size={14} aria-hidden="true" />
              Your smart meter, made understandable
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.02] tracking-[-0.045em] sm:text-6xl xl:text-7xl">
              See where your energy{' '}
              <span className="text-gradient">really goes.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-300">
              Turn Octopus half-hourly readings into clear daily patterns, useful comparisons,
              and practical actions—without spreadsheets or guesswork.
            </p>

            <div className="mt-10 grid max-w-xl gap-4 sm:grid-cols-3">
              {[
                ['90 days', 'Flexible history'],
                ['30 min', 'Reading detail'],
                ['0 keys', 'Stored in browser'],
              ].map(([value, label]) => (
                <div key={label} className="border-l border-white/15 pl-4">
                  <p className="font-display text-2xl font-semibold text-white">{value}</p>
                  <p className="mt-1 text-xs text-slate-400">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Independent personal project. Not affiliated with Octopus Energy.
          </p>
        </section>

        <section className="flex items-center justify-center border-t border-white/10 bg-white/[0.035] px-5 py-10 backdrop-blur-xl lg:border-l lg:border-t-0 sm:px-10 xl:px-20">
          <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-white p-6 text-slate-950 shadow-2xl shadow-black/30 sm:p-8">
            <div className="mb-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <PlugZap size={24} aria-hidden="true" />
              </div>
              <h2 className="font-display text-3xl font-semibold tracking-tight">Connect your account</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                We use your account number to discover the right meters automatically.
              </p>
            </div>

            <form className="space-y-5" onSubmit={onConnect}>
              {!canUseServerConfig && (
                <>
                  <Field label="Octopus API key" hint="Required">
                    <div className="relative">
                      <KeyRound className="input-icon" size={17} aria-hidden="true" />
                      <input
                        className="input-shell"
                        type="password"
                        autoComplete="off"
                        value={credentials.apiKey}
                        onChange={(event) =>
                          setCredentials((current) => ({ ...current, apiKey: event.target.value }))
                        }
                        placeholder="Paste your API key"
                        required
                      />
                    </div>
                  </Field>

                  <Field label="Account number" hint="Required">
                    <input
                      className="input-shell pl-4"
                      type="text"
                      autoCapitalize="characters"
                      value={credentials.accountNumber}
                      onChange={(event) =>
                        setCredentials((current) => ({
                          ...current,
                          accountNumber: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="A-1234ABCD"
                      pattern="A-[A-Za-z0-9]{6,16}"
                      required
                    />
                  </Field>
                </>
              )}

              {canUseServerConfig && (
                <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <Check className="mt-0.5 text-emerald-600" size={18} aria-hidden="true" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Server credentials ready</p>
                    <p className="mt-1 text-xs leading-5 text-emerald-700">
                      The local server is configured, so no credentials are needed in this form.
                    </p>
                  </div>
                </div>
              )}

              <Field label="History to load">
                <div className="relative">
                  <select
                    className="input-shell appearance-none pl-4"
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value))}
                  >
                    {DAY_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option} days</option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-4 top-3.5 text-slate-400" size={17} />
                </div>
              </Field>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700" role="alert">
                  {error}
                </div>
              )}

              <button className="primary-button" type="submit" disabled={loading || !complete}>
                {loading ? (
                  <><LoaderCircle className="animate-spin" size={18} /> Loading your readings…</>
                ) : (
                  <>Open my dashboard <ArrowRight size={18} /></>
                )}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3 text-xs text-slate-400">
              <div className="h-px flex-1 bg-slate-200" />
              or explore safely
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <button className="secondary-button" type="button" onClick={onDemo}>
              <CircleGauge size={18} /> View the interactive demo
            </button>

            <div className="mt-6 flex items-start gap-2.5 rounded-2xl bg-slate-50 p-3.5 text-xs leading-5 text-slate-500">
              <LockKeyhole className="mt-0.5 shrink-0 text-slate-400" size={15} aria-hidden="true" />
              Credentials are sent only to this app’s server for the request. They are not saved to
              local storage or bundled into the website.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, detail, trend, accent = 'violet' }) {
  const trendUp = trend > 0;
  const palette = {
    violet: 'bg-violet-50 text-violet-600',
    blue: 'bg-sky-50 text-sky-600',
    amber: 'bg-amber-50 text-amber-600',
    teal: 'bg-emerald-50 text-emerald-600',
  }[accent];

  return (
    <article className="surface-card p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className={`grid size-10 place-items-center rounded-2xl ${palette}`}>
          <Icon size={19} aria-hidden="true" />
        </div>
        {Number.isFinite(trend) && Math.abs(trend) >= 0.1 && (
          <span className={`flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${trendUp ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            {trendUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold tracking-tight text-slate-950">{value}</p>
      <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>
    </article>
  );
}

function InsightCard({ insight }) {
  const palette = {
    amber: 'bg-amber-50 text-amber-700 ring-amber-100',
    teal: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
    violet: 'bg-violet-50 text-violet-700 ring-violet-100',
    blue: 'bg-sky-50 text-sky-700 ring-sky-100',
  }[insight.tone];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5">
      <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ring-1 ${palette}`}>
        {insight.eyebrow}
      </span>
      <h3 className="mt-4 font-display text-lg font-semibold text-slate-900">{insight.title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{insight.description}</p>
    </article>
  );
}

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-xl shadow-slate-900/10">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold text-slate-950">
        {numberFormatter.format(payload[0].value)} {unit}
      </p>
    </div>
  );
}

function Dashboard({
  dashboard,
  days,
  activeFuel,
  setActiveFuel,
  rates,
  setRates,
  onRangeChange,
  onDisconnect,
  loading,
  health,
}) {
  const intervals = dashboard.usage[activeFuel] || EMPTY_READINGS;
  const unit = activeFuel === 'electricity' ? 'kWh' : 'reported units';
  const analytics = useMemo(
    () => calculateAnalytics(intervals, {
      unitRatePence: activeFuel === 'electricity' ? rates.unitRatePence : 0,
      standingChargePence: activeFuel === 'electricity' ? rates.standingChargePence : 0,
    }),
    [activeFuel, intervals, rates],
  );
  const insights = useMemo(() => localInsightCards(analytics), [analytics]);
  const tariff = dashboard.meters.find((meter) => meter.fuel === activeFuel)?.tariffCode;
  const [aiText, setAiText] = useState('');
  const [aiProvider, setAiProvider] = useState('');
  const [aiFallbackUsed, setAiFallbackUsed] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');

  const requestAiInsight = async () => {
    setAiLoading(true);
    setAiError('');
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: {
            fuel: activeFuel,
            rangeDays: days,
            total: analytics.total,
            averageDaily: analytics.currentAverageDaily || analytics.averageDaily,
            previousAverageDaily: analytics.previousAverageDaily,
            peakInterval: analytics.peakInterval.consumption,
            peakHour: analytics.peakHour.hour,
            overnightShare: analytics.overnightShare,
            estimatedCost: analytics.estimatedCost || 0,
            tariffCode: tariff,
          },
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to generate insight.');
      setAiText(payload.text);
      setAiProvider(payload.provider || '');
      setAiFallbackUsed(Boolean(payload.fallbackUsed));
    } catch (error) {
      setAiError(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-slate-950">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3.5 sm:px-7 lg:px-10">
          <Brand />
          <div className="flex items-center gap-2 sm:gap-3">
            <span className={`hidden items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold sm:flex ${dashboard.demo ? 'bg-violet-50 text-violet-700' : 'bg-emerald-50 text-emerald-700'}`}>
              <span className={`size-1.5 rounded-full ${dashboard.demo ? 'bg-violet-500' : 'bg-emerald-500'}`} />
              {dashboard.demo ? 'Demo data' : 'Live account'}
            </span>
            <button className="ghost-button" type="button" onClick={onDisconnect}>
              <RefreshCw size={15} />
              <span className="hidden sm:inline">Change account</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7 lg:px-10 lg:py-10">
        <section className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
              <span>{dashboard.account.properties[0]?.label || 'Your home'}</span>
              <span className="text-slate-300">/</span>
              <span>{days}-day overview</span>
              {tariff && <><span className="text-slate-300">/</span><span className="font-mono text-[11px]">{tariff}</span></>}
            </div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}.
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Here’s what your energy has been doing, in plain English.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="fuel-switch" aria-label="Fuel type">
              <button
                className={activeFuel === 'electricity' ? 'fuel-active' : ''}
                type="button"
                onClick={() => setActiveFuel('electricity')}
                disabled={!dashboard.usage.electricity.length}
              >
                <Zap size={15} /> Electricity
              </button>
              {dashboard.usage.gas.length > 0 && (
                <button
                  className={activeFuel === 'gas' ? 'fuel-active' : ''}
                  type="button"
                  onClick={() => setActiveFuel('gas')}
                >
                  <Flame size={15} /> Gas
                </button>
              )}
            </div>
            <div className="relative">
              <select
                aria-label="History range"
                className="control-select"
                value={days}
                disabled={loading}
                onChange={(event) => onRangeChange(Number(event.target.value))}
              >
                {DAY_OPTIONS.map((option) => <option key={option} value={option}>{option} days</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3 text-slate-400" size={15} />
            </div>
          </div>
        </section>

        {loading && (
          <div className="mt-6 flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-700" aria-live="polite">
            <LoaderCircle className="animate-spin" size={16} /> Refreshing readings…
          </div>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            icon={Activity}
            label="Total consumption"
            value={`${numberFormatter.format(analytics.total)} ${unit}`}
            detail={`${analytics.daysWithData} days with readings`}
            accent="violet"
          />
          <MetricCard
            icon={CircleGauge}
            label="Daily average"
            value={`${numberFormatter.format(analytics.averageDaily)} ${unit}`}
            detail="Calculated from daily totals—not meter intervals"
            trend={analytics.changePercent}
            accent="blue"
          />
          <MetricCard
            icon={Clock3}
            label="Busiest period"
            value={analytics.peakHour.hour}
            detail={`Peak interval: ${analytics.peakInterval.consumption} ${unit}`}
            accent="amber"
          />
          <MetricCard
            icon={activeFuel === 'electricity' ? Zap : Info}
            label={activeFuel === 'electricity' ? 'Estimated cost' : 'Gas units'}
            value={analytics.estimatedCost === null ? 'Add your rate' : currencyFormatter.format(analytics.estimatedCost)}
            detail={activeFuel === 'electricity'
              ? 'Uses only the rates you enter below'
              : 'Octopus gas units vary by meter generation'}
            accent="teal"
          />
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1.55fr_0.85fr]">
          <article className="surface-card min-w-0 p-5 sm:p-7">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <p className="section-eyebrow">Daily profile</p>
                <h2 className="section-title">Consumption over time</h2>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="size-2 rounded-full bg-violet-500" />
                Daily {activeFuel}
              </div>
            </div>
            <div className="mt-7 h-[320px] w-full">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={1}
                initialDimension={{ width: 640, height: 320 }}
              >
                <AreaChart data={analytics.daily} margin={{ top: 10, right: 6, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#7c3aed" stopOpacity={0.015} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8edf3" strokeDasharray="3 3" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} minTickGap={28} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={48} />
                  <Tooltip content={<ChartTooltip unit={unit} />} />
                  <Area type="monotone" dataKey="consumption" stroke="#7c3aed" strokeWidth={2.5} fill="url(#usageFill)" activeDot={{ r: 5, fill: '#7c3aed', stroke: '#fff', strokeWidth: 3 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="surface-card p-5 sm:p-7">
            <p className="section-eyebrow">Time of day</p>
            <h2 className="section-title">Your 24-hour rhythm</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Average consumption for each hour across the selected range.</p>
            <div className="mt-6 h-[270px]">
              <ResponsiveContainer
                width="100%"
                height="100%"
                minWidth={0}
                minHeight={1}
                initialDimension={{ width: 420, height: 270 }}
              >
                <BarChart data={analytics.hourly} margin={{ top: 5, right: 0, left: -28, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#edf0f5" />
                  <XAxis dataKey="hour" axisLine={false} tickLine={false} interval={5} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                  <Tooltip content={<ChartTooltip unit={unit} />} />
                  <Bar dataKey="consumption" fill="#0ea5e9" radius={[4, 4, 1, 1]} maxBarSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_1fr]">
          <article className="surface-card p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="section-eyebrow">Smart takeaways</p>
                <h2 className="section-title">What the numbers suggest</h2>
              </div>
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-50 text-amber-600">
                <Lightbulb size={19} />
              </div>
            </div>
            <div className="mt-6 grid gap-3 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
              {insights.map((insight) => <InsightCard key={insight.eyebrow} insight={insight} />)}
            </div>
          </article>

          <article className="overflow-hidden rounded-3xl bg-[#111b31] p-5 text-white shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-fuchsia-300">Optional AI coach</p>
                <h2 className="mt-2 font-display text-2xl font-semibold">A second opinion, on demand</h2>
              </div>
              <div className="grid size-11 place-items-center rounded-2xl bg-white/10 text-fuchsia-300">
                <Bot size={21} />
              </div>
            </div>

            {aiText ? (
              <>
                <div className="ai-copy mt-6 whitespace-pre-line rounded-2xl border border-white/10 bg-white/5 p-5 text-sm leading-7 text-slate-200">
                  {aiText}
                </div>
                {aiProvider && (
                  <p className="mt-3 text-xs text-slate-400">
                    Generated with {aiProvider === 'openai' ? 'OpenAI' : 'Anthropic'}{aiFallbackUsed ? ' fallback' : ''}.
                  </p>
                )}
              </>
            ) : (
              <p className="mt-5 max-w-xl text-sm leading-6 text-slate-300">
                Pulse sends only aggregate statistics—not your API key, meter identifiers, or raw half-hour readings—to the configured AI provider.
              </p>
            )}

            {aiError && <p className="mt-4 text-sm text-rose-300" role="alert">{aiError}</p>}
            <button
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-fuchsia-50 disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              disabled={!health?.aiAvailable || aiLoading}
              onClick={requestAiInsight}
            >
              {aiLoading ? <LoaderCircle className="animate-spin" size={16} /> : <Sparkles size={16} />}
              {health?.aiAvailable ? (aiText ? 'Refresh AI view' : 'Generate AI insight') : 'Add server AI key to enable'}
            </button>
          </article>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <article className="surface-card p-5 sm:p-7">
            <p className="section-eyebrow">Cost assumptions</p>
            <h2 className="section-title">Use your own tariff rates</h2>
            <p className="mt-2 text-xs leading-5 text-slate-500">Rates are held only in memory and are never sent to Octopus.</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <Field label="Unit rate" hint="p/kWh">
                <input className="input-shell pl-4" type="number" min="0" step="0.01" value={rates.unitRatePence} onChange={(event) => setRates((current) => ({ ...current, unitRatePence: event.target.value }))} placeholder="e.g. 24.50" />
              </Field>
              <Field label="Standing charge" hint="p/day">
                <input className="input-shell pl-4" type="number" min="0" step="0.01" value={rates.standingChargePence} onChange={(event) => setRates((current) => ({ ...current, standingChargePence: event.target.value }))} placeholder="e.g. 55.00" />
              </Field>
            </div>
            {dashboard.demo && (
              <p className="mt-4 flex items-start gap-2 rounded-xl bg-violet-50 p-3 text-xs leading-5 text-violet-700">
                <Info size={14} className="mt-0.5 shrink-0" /> Demo rates are illustrative, not current market prices.
              </p>
            )}
          </article>

          <article className="surface-card p-5 sm:p-7">
            <p className="section-eyebrow">Connection details</p>
            <h2 className="section-title">What’s feeding this dashboard</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {dashboard.meters.map((meter) => (
                <div key={`${meter.fuel}-${meter.identifier}-${meter.serial}`} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-sm font-semibold capitalize text-slate-800">
                      {meter.fuel === 'electricity' ? <Zap size={16} className="text-violet-600" /> : <Flame size={16} className="text-orange-500" />}
                      {meter.fuel}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600"><span className="size-1.5 rounded-full bg-emerald-500" /> Active</span>
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div><dt className="text-slate-400">Meter point</dt><dd className="mt-1 font-mono text-slate-700">{meter.identifier}</dd></div>
                    <div><dt className="text-slate-400">Serial</dt><dd className="mt-1 font-mono text-slate-700">{meter.serial}</dd></div>
                  </dl>
                </div>
              ))}
            </div>
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Clock3 size={14} /> Latest reading: {formatReadingDate(intervals.at(-1)?.interval_start)}
            </p>
          </article>
        </section>

        <footer className="mt-8 flex flex-col justify-between gap-3 border-t border-slate-200 py-6 text-xs text-slate-400 sm:flex-row">
          <p>Pulse keeps credentials in memory only. Disconnecting clears this session.</p>
          <p>Built with Octopus Energy data · Times shown in Europe/London</p>
        </footer>
      </div>
    </main>
  );
}

export default function App() {
  const [credentials, setCredentials] = useState({ apiKey: '', accountNumber: '' });
  const [dashboard, setDashboard] = useState(null);
  const [days, setDays] = useState(14);
  const [activeFuel, setActiveFuel] = useState('electricity');
  const [rates, setRates] = useState({ unitRatePence: '', standingChargePence: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then((response) => (response.ok ? response.json() : null))
      .then(setHealth)
      .catch(() => setHealth({ aiAvailable: false, octopusConfigured: false }));
  }, []);

  const loadLiveDashboard = async (targetDays = days) => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/octopus/dashboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credentials, days: targetDays }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to load your readings.');
      setDashboard(payload);
      setActiveFuel(payload.usage.electricity.length ? 'electricity' : 'gas');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (event) => {
    event.preventDefault();
    loadLiveDashboard();
  };

  const handleDemo = () => {
    setDashboard(createDemoDashboard(days));
    setRates({ unitRatePence: '25', standingChargePence: '55' });
    setActiveFuel('electricity');
    setError('');
  };

  const handleRangeChange = async (nextDays) => {
    setDays(nextDays);
    if (dashboard.demo) {
      setDashboard(createDemoDashboard(nextDays));
      return;
    }
    await loadLiveDashboard(nextDays);
  };

  const disconnect = () => {
    setDashboard(null);
    setCredentials({ apiKey: '', accountNumber: '' });
    setRates({ unitRatePence: '', standingChargePence: '' });
    setError('');
  };

  if (!dashboard) {
    return (
      <ConnectionView
        credentials={credentials}
        setCredentials={setCredentials}
        days={days}
        setDays={setDays}
        loading={loading}
        error={error}
        health={health}
        onConnect={handleConnect}
        onDemo={handleDemo}
      />
    );
  }

  return (
    <Dashboard
      key={`${activeFuel}-${dashboard.range.from}`}
      dashboard={dashboard}
      days={days}
      activeFuel={activeFuel}
      setActiveFuel={setActiveFuel}
      rates={rates}
      setRates={setRates}
      onRangeChange={handleRangeChange}
      onDisconnect={disconnect}
      loading={loading}
      health={health}
    />
  );
}
