# User guide

Pulse has two interactive modes: a safe generated-data demo and a live Octopus account connection. A separate owner-only deployment job can send a monthly email; it is not a public mailing-list feature.

## Use the interactive demo

1. Open the [deployed app](https://octopus-energy-app-psi.vercel.app).
2. Select **View the interactive demo**.
3. Switch between electricity and gas.
4. Change the history range between 7 and 90 days.
5. Explore daily totals, the hourly profile and deterministic smart takeaways.
6. Change the illustrative electricity unit rate and standing charge to see the estimated cost recalculate.

The demo creates a fresh set of illustrative half-hour readings in your browser. The values and tariff codes are synthetic and are not market comparisons.

## Connect a live Octopus account

You need your Octopus account number, normally in the form `A-…`, and your Octopus API key.

Octopus says the API key is available after signing in under **Personal details → Development settings**. Its [official API documentation](https://developer.octopus.energy/guides/rest/rest-api-basics/) explains authentication and warns users to keep the key private.

1. Open a deployment you trust or run Pulse locally.
2. Choose the history range.
3. Enter the API key and account number.
4. Select **Open my dashboard**.

The server uses the account endpoint to discover import electricity meters and gas meters, then retrieves consumption for each meter. Meter-point and serial identifiers are masked before the response reaches the browser.

### Credential behaviour

- Pulse does not write the form values to `localStorage`, `sessionStorage` or a database.
- They remain in React memory while the dashboard is open and are sent to the app server when readings are requested or the range changes.
- **Change account** clears the in-memory credentials and dashboard state.
- HTTPS protects the request in transit on the hosted app, but the hosting platform still processes the server request. Only use a deployment you control and trust.

A private local deployment can instead set `OCTOPUS_API_KEY` and `OCTOPUS_ACCOUNT_NUMBER` on the server. Do not use that convenience on a public unauthenticated deployment: any visitor could query the configured account through the dashboard endpoint.

## Read the dashboard

The selected fuel and time range drive all charts and cards.

| Item | Meaning |
| --- | --- |
| Total consumption | Sum of the returned intervals in the selected range |
| Daily average | Total divided by London calendar days that contain readings |
| Busiest period | London hour with the highest average interval consumption |
| Estimated cost | Electricity usage and days with readings multiplied by your supplied rates |
| Daily profile | Consumption grouped into Europe/London calendar days |
| 24-hour rhythm | Average interval consumption for each London clock hour |
| Smart takeaways | Local rules comparing recent days, peak hour and overnight share |

The latest reading time is shown in Europe/London. A partial current day can lower or distort daily comparisons.

## Add tariff rates

Use the values shown on your current Octopus tariff or bill:

- **Unit rate**: electricity price in pence per kilowatt-hour, for example `25.85`;
- **Standing charge**: electricity daily charge in pence per day, for example `60.89`.

Do not include the `p`, `£` or `/day` symbols. The values stay in browser memory and are not sent to Octopus. Pulse uses a simple estimate:

```text
(electricity kWh × unit rate pence + days with readings × standing charge pence) ÷ 100
```

This calculation does not model multiple time bands, tariff changes inside the selected range, discounts, VAT adjustments, export payments or billing corrections. Check the result against the bill.

## Use the optional AI coach

The button is enabled only when the server has an OpenAI or Anthropic key.

Pulse sends the provider a constrained aggregate summary: fuel, range, totals, averages, peak values, peak hour, overnight share, estimated cost and tariff code. It does not include your Octopus key, account number, meter identifiers or raw half-hour readings.

OpenAI is tried first. Anthropic is used when it is the only configured provider or when the OpenAI request fails. AI text can be incomplete or wrong; treat it as a second opinion, not billing or safety advice.

## Monthly owner email

The deployed owner can configure a Vercel Cron job to email one summary on the third day of each month. The report covers the previous complete Europe/London month and compares it with the month before that.

The email includes electricity and gas aggregates, coverage, peaks, top days, an electricity cost estimate and either AI-generated or deterministic recommendations. It uses deployment secrets and Resend; there is no sign-up form in the app. See [Development](DEVELOPMENT.md#monthly-report-configuration) to operate it.

## Troubleshooting

### “The service could not complete that request”

- Check the account number and API key.
- Confirm the API key works against Octopus's account endpoint.
- Try a shorter range in case pagination or provider latency is the problem.
- If running locally, confirm both Vite and the Express server are running.
- Review server or Vercel function logs; the public error deliberately hides internal details.

### Electricity appears but gas does not

Pulse only shows the gas tab when Octopus returns gas consumption intervals. A discovered gas meter with no available readings can still appear in connection details but will not produce analytics. Check the Octopus account or smart-meter display and raise missing upstream readings with Octopus; the app cannot reconstruct them.

### The gas value is not in kWh

Pulse labels gas as **reported units**. Octopus consumption representation can differ with meter generation, and this project deliberately does not claim a gas conversion or cost estimate.

### “Add server AI key to enable”

The app server has no supported AI provider key. Add an OpenAI key, or optionally an Anthropic fallback key, to a trusted local or hosted server and restart/redeploy it. A ChatGPT subscription does not include OpenAI API credit.

### The monthly email did not arrive

- Confirm the cron deployment and all `REPORT_*`, `RESEND_API_KEY` and `CRON_SECRET` variables.
- Check the Vercel cron and function logs for the third day of the month at 08:00 UTC.
- Check Resend delivery status and the recipient's junk folder.
- Verify the sender address or domain is permitted by Resend.
- Remember that the production idempotency key prevents duplicate delivery for the same report month.

[Back to the README](../README.md)
