# Pulse repository contract

This is a parked Vite, React and Express portfolio project deployed through Vercel.
Prefer security and compatibility maintenance over new product scope.

## Safety boundaries

- Use the generated-data demo for routine browser and deployment checks.
- Never invoke `/api/cron/monthly-report` with authorisation or `?test=1` unless
  Hakim explicitly asks to send a report; the route can send email and incur costs.
- Do not use live Octopus, OpenAI, Anthropic or Resend credentials for regression tests.
- Treat `.env*`, `server/.env` and hosted environment values as private.
- Patch dependency updates may auto-merge only after all required checks pass.
  Review minor and major dependency updates individually.

## Verification

Run `npm ci`, `npm --prefix server ci`, `npm test`, `npm run lint`,
`npm run build`, both critical npm audits and `npm run test:smoke`.
For a pull request, match the Vercel preview to the exact head commit before
accepting deployment smoke results.
