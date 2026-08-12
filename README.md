# Pulse — Octopus Energy insights

Pulse turns Octopus Energy half-hourly consumption readings into daily trends, time-of-day patterns, tariff-based cost estimates, and optional AI guidance.

The app now uses a privacy-first client/server design:

- The browser never calls Octopus, OpenAI, or Anthropic directly.
- Octopus credentials are held in memory for a request and are not saved to browser storage.
- The server discovers meter identifiers from the Octopus account endpoint.
- Only aggregate statistics are sent to the configured AI provider when the optional AI coach is enabled.
- An interactive demo works without credentials or a backend connection.

## Run locally

Prerequisites: Node.js 18 or newer and npm.

```powershell
npm install
npm --prefix server install
npm run dev:all
```

Open `http://localhost:5173`. If that port is occupied, Vite prints the next available port.

## Optional server configuration

Copy `server/.env.example` to `server/.env` and fill in any values you want the server to own:

```powershell
Copy-Item server/.env.example server/.env
```

- `OCTOPUS_API_KEY` and `OCTOPUS_ACCOUNT_NUMBER` remove the need to enter Octopus credentials in the UI.
- `OPENAI_API_KEY` enables OpenAI as the primary AI coach provider.
- `OPENAI_MODEL` selects the server-controlled OpenAI model (the default is the cost-efficient `gpt-5.6-luna`).
- `ANTHROPIC_API_KEY` is optional. When both keys exist, Anthropic is used automatically if OpenAI fails; without an OpenAI key, it remains the primary provider.
- `ANTHROPIC_MODEL` selects the server-controlled Anthropic fallback model.
- `ALLOWED_ORIGINS` controls which browser origins may call the API.

Never commit `server/.env`; it is ignored by Git.

## Quality checks

```powershell
npm run lint
npm test
npm run build
```

## Monthly email report

The production deployment can send a private report for the previous complete
calendar month. The Vercel Cron job runs at 08:00 UTC on the third day of each
month, compares the report month with the month before, and uses an idempotency
key to prevent duplicate monthly sends.

Configure these as production-only Vercel environment variables:

- `REPORT_OCTOPUS_API_KEY` and `REPORT_OCTOPUS_ACCOUNT_NUMBER` load the owner's data.
- `REPORT_OPENAI_API_KEY` enables the aggregate-only AI coach; delivery falls back
  to deterministic recommendations if OpenAI is unavailable.
- `RESEND_API_KEY`, `REPORT_TO_EMAIL`, and `REPORT_FROM_EMAIL` configure delivery.
- `REPORT_UNIT_RATE_PENCE` and `REPORT_STANDING_CHARGE_PENCE` configure the cost estimate.
- `REPORT_DASHBOARD_URL` links the email back to Pulse.
- `CRON_SECRET` protects the cron endpoint. Vercel supplies it as a bearer token.

These deliberately use `REPORT_*` names instead of the public dashboard's
optional variables. That keeps the owner's Octopus and OpenAI credentials
exclusive to the scheduled workflow. Only aggregate statistics—not credentials,
account or meter identifiers, or raw readings—are included in the AI prompt.

## Data notes

- Consumption requests use explicit UTC dates, chronological ordering, and pagination.
- Daily aggregation uses the `Europe/London` time zone.
- Electricity is displayed in kWh.
- Octopus notes that gas readings may be kWh for SMETS1 meters or cubic metres for SMETS2 meters, so gas is labelled as “reported units”.
- Cost estimates use only the unit rate and standing charge entered by the user. Demo rates are illustrative.

## Security notes

The API applies request-size limits, origin checks, basic in-memory rate limiting, input validation, server-controlled AI prompts/model selection, upstream timeouts, and restricted pagination hosts. A public multi-user deployment should additionally add user authentication, durable distributed rate limiting, HTTPS, and a managed secret store.

Pulse is an independent personal project and is not affiliated with Octopus Energy.

## Public demo deployment

The repository includes a Vercel function entrypoint and routing configuration so
the Vite frontend and Express API deploy together. Do not add `server/.env` or
the generic `OPENAI_API_KEY` / `OCTOPUS_API_KEY` variables to a public demo: the
interactive demo and user-supplied Octopus connection work without them. Use the
dedicated `REPORT_*` variables only for the protected monthly workflow.
