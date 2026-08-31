# Project status

## Parked snapshot

**Status:** feature-complete personal project, parked on 31 August 2026.

Pulse is preserved as a portfolio demonstration and learning reference. Its implemented scope is complete: safe demo data, live Octopus exploration, local analytics, optional aggregate-only AI coaching and a private monthly owner email. No further feature development is planned.

The deployed demo may remain available while hosting permits, but repository documentation is the durable artefact. A working public URL should not be interpreted as an actively supported service.

## Why it is parked

- The project achieved its intended learning and portfolio goals.
- Live use depends on personal Octopus credentials and the availability and quality of upstream smart-meter readings.
- The owner's gas smart-meter intervals have been missing upstream; the app cannot repair that source-data problem.
- AI coaching and email delivery depend on paid or metered third-party APIs.
- A public multi-user product would require authentication, durable rate limiting, monitoring, credential lifecycle design and ongoing operational ownership.

## Preserved capabilities

| Area | State at archive |
| --- | --- |
| Interactive generated-data demo | Complete |
| Live account and automatic meter discovery | Complete for supported Octopus REST responses |
| Electricity and gas usage charts | Complete when intervals exist |
| London-time daily and hourly analysis | Complete |
| User-supplied electricity cost estimate | Complete, deliberately simple |
| Deterministic smart takeaways | Complete |
| OpenAI coach with Anthropic fallback | Complete, environment-gated |
| Monthly owner report through Vercel and Resend | Complete, environment-gated |
| Automated internal and mocked-provider tests | Complete |
| Public authentication and multi-user accounts | Not implemented |
| Gas conversion and cost estimation | Not implemented by design |
| Time-of-use tariff pricing | Not implemented |

## Known limitations and technical debt

### Product

- Partial days and gaps can affect comparisons.
- Tariff codes are displayed but do not drive prices.
- Cost estimates use one electricity unit rate and standing charge across the whole range.
- Gas values remain in reported units and have no cost estimate.
- There is no export, device control, alerting, budgeting or bill reconciliation.
- The monthly report has one configured owner recipient and no UI management.

### Data and integrations

- Octopus can return delayed, missing or corrected intervals.
- A discovered gas meter may have no consumption data.
- Consumption pagination is capped at 20 pages and meter discovery at eight meters.
- AI model identifiers and response formats can change after this snapshot.
- Email delivery depends on Resend account and domain configuration.
- Vercel scheduling, limits and protected-preview settings remain external to the repository.

### Security and operations

- Public routes have no authentication.
- Rate limiting is in process memory and is not globally consistent on serverless infrastructure.
- Server-configured interactive Octopus credentials are unsafe on an open deployment.
- Public AI access can spend the owner's API credit.
- There is no database-backed job ledger, metrics, alerting or incident runbook.
- Dependency updates and security patches are not scheduled after archive.

## Verification boundary

The archive can verify source-controlled behaviour with automated tests, linting, a production build, local health checks and the credential-free browser demo. It cannot permanently verify future Octopus responses, missing gas readings, live AI model access, Vercel schedule execution, Resend delivery or continued availability of the public deployment. Those integrations require secrets, billable services or state outside the repository and must be revalidated during any revival.

## Archive checklist

After the final documentation pull request is merged:

1. Confirm the production deployment reflects the merged commit and the demo still opens.
2. Decide whether to keep or disable the monthly cron and public deployment.
3. Rotate or remove Vercel environment secrets that are no longer required.
4. Check the repository description and website URL.
5. Enable GitHub's **Archive this repository** setting if a read-only repository is desired.
6. Retain this status guide and lockfiles as the hand-off snapshot.

Do not archive the GitHub repository before merging the documentation pull request because archived repositories are read-only.

## Revival checklist

1. Unarchive or fork the repository and create a new branch.
2. Rotate credentials and rebuild environment configuration from `server/.env.example`.
3. Verify supported Node/Vite versions and reinstall from both lockfiles.
4. Audit Octopus REST endpoints and gas units against current official documentation.
5. Confirm current OpenAI/Anthropic models and API response formats.
6. Confirm current Vercel Cron and Resend semantics.
7. Run tests, lint, build and the full local demo flow.
8. Add authentication, a distributed limiter and observability before public owner-backed use.
9. Test live providers only with explicit cost and email-delivery approval.

## Learning map

Read the repository in this order:

1. [`src/lib/energy.js`](../src/lib/energy.js) for the pure analytics core.
2. [`src/lib/demo.js`](../src/lib/demo.js) for safe, realistic demo data.
3. [`src/App.jsx`](../src/App.jsx) for React state and presentation flow.
4. [`server/octopus.js`](../server/octopus.js) for defensive third-party API integration.
5. [`server/insights.js`](../server/insights.js) for aggregate-only AI boundaries.
6. [`server/monthly-report.js`](../server/monthly-report.js) and [`server/report-email.js`](../server/report-email.js) for scheduled delivery.
7. The matching `*.test.js` files for executable examples of each contract.

[Back to the README](../README.md)
