# HealthTrack 1.0 demo

Interactive product demo of **HealthTrack**, a personal wellness guidance system. It follows `docs/HT_1.0_V2_Blue_print_Oct_2026.pdf` and the implementation spec in `docs/blueprint-analysis.md`.

Philosophy: **Know your normal. Notice what matters. Do ONE thing. Repeat what works.**

Accounts, profiles, and health measurements are stored on the server. The companion mobile app is a separate project. See `docs/mobile-integration.md`.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The local database file is `data/healthtrack.db` and is created on first use. Copy `.env.example` if you need email, Google sign-in, or a hosted database.

Other scripts:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

Health check: `GET /api/health`.

## Product path

1. Create an account or sign in.
2. Finish onboarding. A returning account resumes the saved profile.
3. Today shows stored measurements. With no companion upload, metrics stay unavailable rather than zero.
4. Devices can create a one-time pairing code. Nothing is shown as connected until the mobile app completes pairing.
5. Profile can sign out, delete health data, or delete the account.

## Architecture

| Layer | Location | Role |
| --- | --- | --- |
| UI | `src/app`, `src/components` | App Router screens |
| Account session | `src/lib/auth.ts` | Better Auth, server-side password hashing |
| Database | `src/db/index.ts` | SQLite locally, libSQL when `DATABASE_URL` is remote |
| Profile and devices | `src/lib/services/workspace.ts`, `pairing.ts` | Server-persisted profile and device credentials |
| Measurements | `src/lib/services/measurements.ts` | Validation, idempotent batches, daily aggregates |
| Client cache | `src/lib/store.tsx` | Hydrates from `GET /api/v1/me/workspace` |
| Baseline / status | `src/lib/engines/baseline.ts`, `status.ts` | Deterministic, versioned `status-engine@0.1-demo` |
| Behavior ranking | `src/lib/engines/behaviors.ts` | Today’s ONE and Repeat ONE |
| Coach | `src/lib/services/coach.ts`, `src/app/api/coach/route.ts` | Deterministic wording; optional OpenAI rewrite |
| Contract | `docs/openapi/v1.yaml` | Companion API |

The consumer sees **Thriving / Stable / Shifting / Needs Attention**, not a 0–100 health score.

## What is real vs simulated

**Computed from stored measurements:**

- Personal baselines (rolling median / MAD)
- My Wellness Status and explainable drivers
- Today’s ONE ranking from a curated low-risk library
- Repeat ONE evidence rules
- Trend ranking vs personal baseline
- Behavior associations (labeled as associations, not causation)
- Coach answers grounded in those engines

**Not available until configured or delivered:**

- Companion mobile app and any HealthKit or Health Connect access
- Email verification and password reset until `RESEND_API_KEY` and `EMAIL_FROM` are set
- Google sign-in until Google OAuth credentials are set
- Lab PDF parsing
- Live LLM wording unless `OPENAI_API_KEY` is set

HealthTrack 1.0 does not diagnose, treat, prevent, or detect disease. Thresholds are demo calibrations; the blueprint states they are not clinically validated.

## Environment variables

See `.env.example`.

| Name | Required | Purpose |
| --- | --- | --- |
| `BETTER_AUTH_SECRET` | Production | Session signing secret |
| `BETTER_AUTH_URL` | Production | Public origin |
| `DATABASE_URL` | Production | Hosted libSQL URL. Local default is a SQLite file |
| `DATABASE_AUTH_TOKEN` | Remote DB | libSQL auth token |
| `RESEND_API_KEY`, `EMAIL_FROM` | No | Verification and password reset |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | No | Google sign-in |
| `OPENAI_API_KEY` | No | Optional coach wording |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |

Never put secrets in client code. Database and provider credentials stay on the server.

## Deploy on Vercel

The app is a Next.js App Router project. Build command: `npm run build`. Production needs `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, and a hosted libSQL `DATABASE_URL`. A file database does not persist on Vercel.

The existing public site is the earlier demo and does not include this account system until a new deployment is published. Do not deploy from this tree unless that is intended.

To deploy a preview from this directory:

```bash
npx vercel login
npx vercel link --yes --project healthtrack-demo --scope edxnoels-projects
npx vercel
```

That creates a **preview** URL. Do not run `vercel --prod` unless you intend to overwrite production.

Signed-in routes redirect to `/sign-in` when the session cookie is missing. `/watch` redirects to Devices.

## Limitations

- The companion app is not available. Pairing codes can be created, and they do nothing until that app calls the API.
- Email and Google sign-in stay disabled until their environment variables are set. The UI does not claim those messages were sent.
- Rate limits are per server instance.
- Lab parsing and payments are not implemented.
- Organization, school, and provider dashboards are out of scope.
- Optional OpenAI calls fall back to the local engine and do not overwrite measurements.
