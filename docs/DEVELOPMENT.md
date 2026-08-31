# Development and operations

This guide describes the preserved 31 August 2026 repository. Re-check provider documentation, model availability and dependency support before reviving it.

## Repository layout

```text
octopus-energy-app/
├── api/index.js                 Vercel adapter
├── docs/                        User, architecture and status guides
├── public/                      Static assets
├── server/
│   ├── index.js                 Express routes and local entry point
│   ├── octopus.js               Octopus integration
│   ├── insights.js              Interactive AI providers
│   ├── monthly-analytics.js     Complete-month calculations
│   ├── monthly-report.js        Scheduled orchestration
│   ├── report-email.js          Email rendering and Resend client
│   └── *.test.js                Server tests
├── src/
│   ├── App.jsx                  React application
│   ├── index.css                Tailwind theme and component styles
│   └── lib/                     Demo generation, analytics and tests
├── index.html
├── vercel.json                  Rewrites and cron declaration
└── vite.config.js               React, Tailwind, chunking and API proxy
```

## Install and run

Use a Node.js release accepted by the checked-in Vite package. The lockfile snapshot expects a modern Node 20 or 22 runtime.

```powershell
npm install
npm --prefix server install
Copy-Item server\.env.example server\.env
npm run dev:all
```

`npm run dev:all` launches Express on port 3001 and Vite on its available development port. The Vite server proxies `/api` to Express. The credential-free demo requires no environment values.

Useful individual commands are `npm run server:start`, `npm run client:dev` and `npm run preview`.

## Environment variables

Keep local values in `server/.env`. It is ignored by Git. Hosted values belong in Vercel project settings. Never commit real secrets or copy them into screenshots, issues or documentation.

### Interactive dashboard

| Variable | Required | Purpose |
| --- | --- | --- |
| `OCTOPUS_API_KEY` | No | Private-server convenience credential used when the request omits a key |
| `OCTOPUS_ACCOUNT_NUMBER` | No | Matching account used when the request omits an account |
| `OPENAI_API_KEY` | No | Enables the primary interactive AI coach |
| `OPENAI_MODEL` | No | OpenAI model; code default is `gpt-5.6-luna` in this snapshot |
| `ANTHROPIC_API_KEY` | No | Enables fallback, or primary AI when OpenAI is absent |
| `ANTHROPIC_MODEL` | No | Anthropic model; code default is `claude-sonnet-4-20250514` |
| `ALLOWED_ORIGINS` | Local only | Comma-separated browser origins accepted by CORS |
| `PORT` | Local only | Express port; defaults to `3001` |

Do not set the interactive Octopus credentials on a public unauthenticated deployment. The form disappears when `/api/health` reports server credentials, and any visitor can then load that account. Likewise, a public AI route can spend the configured provider credit.

### Monthly report configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `REPORT_OCTOPUS_API_KEY` | Yes | Owner's Octopus credential for the scheduled job |
| `REPORT_OCTOPUS_ACCOUNT_NUMBER` | Yes | Owner account for the scheduled job |
| `REPORT_OPENAI_API_KEY` | No | Generates aggregate-only monthly coaching |
| `REPORT_OPENAI_MODEL` | No | Monthly model; falls back to `OPENAI_MODEL`, then the code default |
| `RESEND_API_KEY` | Yes | Sends the email through Resend |
| `REPORT_TO_EMAIL` | Yes | Report recipient |
| `REPORT_FROM_EMAIL` | No | Sender; defaults to `Pulse <onboarding@resend.dev>` |
| `REPORT_UNIT_RATE_PENCE` | No | Electricity unit rate used in the report |
| `REPORT_STANDING_CHARGE_PENCE` | No | Electricity daily standing charge |
| `REPORT_DASHBOARD_URL` | No | Optional link placed in the email |
| `CRON_SECRET` | Yes | Bearer secret required by the cron route |

`vercel.json` calls `/api/cron/monthly-report` at `08:00 UTC` on day 3 of every month. The calculation uses the previous complete `Europe/London` month and the month before it for comparison. Use Production-only values for owner secrets unless a preview integration test is deliberate and controlled.

## HTTP API

### `GET /api/health`

Returns feature availability without returning secrets:

```json
{
  "status": "ok",
  "aiAvailable": true,
  "aiProvider": "openai",
  "aiFallbackAvailable": false,
  "octopusConfigured": false,
  "monthlyReportConfigured": true
}
```

### `POST /api/octopus/dashboard`

```json
{
  "apiKey": "request-only value",
  "accountNumber": "A-EXAMPLE",
  "days": 14
}
```

Allowed day values are `7`, `14`, `30`, `60` and `90`. The route is limited to 20 requests per minute per observed process/IP. It returns sanitised account metadata, a range, masked meters and electricity/gas interval arrays.

### `POST /api/insights`

Accepts a `summary` object containing bounded aggregate fields. It is limited to eight requests per minute per observed process/IP. OpenAI is primary; Anthropic is the optional fallback. It returns `text`, `provider` and `fallbackUsed` fields.

### `GET /api/cron/monthly-report`

Requires `Authorization: Bearer <CRON_SECRET>`. Production mode sends a month-idempotent email. `?test=1` marks the subject as a test and uses a timestamped idempotency key, so it can send repeatedly.

Do not invoke this route with real delivery configuration merely as a health check. Use the automated dependency-injected tests instead.

## Data handling

- Octopus uses HTTP Basic authentication with the API key as the username and an empty password.
- Account discovery excludes export electricity meters and strips addresses.
- Consumption requests include explicit UTC boundaries, chronological order and a page size of 250.
- Pagination follows only `https://api.octopus.energy` URLs and stops after 20 pages.
- At most eight discovered meters are loaded in one dashboard operation.
- Equal timestamps from multiple meters of one fuel are summed.
- Client and monthly groupings use `Europe/London`, including DST transitions.
- Gas remains in provider-reported units; the application does not calculate gas cost.

## Tests and quality checks

```powershell
npm test
npm run lint
npm run build
```

The Node test suite covers London-time aggregation, demo series, account sanitisation, trusted pagination, merged meters, AI prompt constraints and fallback, month boundaries across British Summer Time, report analytics, deterministic recommendations, Resend idempotency and cron authorisation. It mocks every external provider, consumes no live API credit and sends no email.

For an end-to-end UI check, start `npm run dev:all`, open the demo, change fuel and history range, edit the electricity rate, return to the connection view, and check browser console and network errors. Avoid live credentials for routine regression testing.

## Vercel deployment

Vercel builds the Vite frontend. Requests under `/api/*` are rewritten to `api/index.js`; other paths fall back to `index.html`.

A production deployment should verify:

1. Tests, lint and build pass.
2. The demo opens without secrets.
3. `/api/health` reveals availability only, not values.
4. Owner credentials use `REPORT_*`, not interactive `OCTOPUS_*` names.
5. `CRON_SECRET`, Resend sender verification and Production scoping are correct.
6. Function duration is sufficient for two months of reads; `api/index.js` requests 60 seconds.
7. Logs and provider usage are monitored.

## Common development problems

**The frontend works but every API call fails.** Run `npm run dev:all`, not only `npm run dev`, and check port 3001.

**CORS blocks a different Vite port.** Add the exact local origin to `ALLOWED_ORIGINS` and restart Express.

**The OpenAI model is rejected.** Model identifiers and account access change. Set `OPENAI_MODEL` or `REPORT_OPENAI_MODEL` to a currently supported model after checking official documentation, then rerun the mocked tests and a controlled integration request.

**Consumption is incomplete.** Inspect provider pagination and the requested range. The 20-page safety bound can truncate unusually dense or long responses; the UI maximum is 90 days.

**Vercel cron times appear shifted.** The schedule is UTC, while report boundaries are Europe/London. This is deliberate.

## Safe revival workflow

1. Read [Project status](PROJECT_STATUS.md) and this guide.
2. Unarchive or fork the repository and create a focused branch.
3. Rotate old credentials rather than assuming preserved values remain safe.
4. Install from the lockfiles and audit runtime and dependency compatibility.
5. Verify Octopus endpoints, Resend behaviour and current AI model/API contracts.
6. Run all automated checks and the local demo browser flow.
7. Add authentication and distributed protection before owner-backed public routes.
8. Use a preview deployment before promoting production.

[Back to the README](../README.md)
