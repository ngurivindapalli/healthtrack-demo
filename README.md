# HealthTrack 1.0 demo

Interactive product demo of **HealthTrack**, a personal wellness guidance system. It follows `docs/HT_1.0_V2_Blue_print_Oct_2026.pdf` and the implementation spec in `docs/blueprint-analysis.md`.

Philosophy: **Know your normal. Notice what matters. Do ONE thing. Repeat what works.**

This is a frontend-first Vercel demo. It does not require an account, wearable credentials, a database, or API keys.

## Local setup

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run lint
npm run typecheck
npm run build
npm start
```

## Demonstration path

1. Land on the entry screen.
2. Choose **Open Ram’s Today** (prepopulated) or **Start with an empty profile**.
3. On **Today**, read My Wellness Status, compact pillar states, Today’s ONE, and Repeat ONE. Watch data should show as stale (last vendor sync 7:12 am).
4. Open **Pulse Watch**, click **Sync watch data**, then return to Today — steps, recovery, activity, charts, and associations update from the same store.
5. Accept, decline, replace, snooze, or mark the ONE done. Check-ins and context flags update the engines.
6. Open **Trends** for ranked personal-baseline deviations and drill into a pillar.
7. Open **Progress** for the Personal Behavior Library, associations, and a weekly reflection.
8. Open **Profile** for devices, parsed labs, privacy, then **Ask Health Coach**.
9. Use **Reset demo** to restore Ram’s 16 Oct 2026 workspace, including a stale morning last-sync.

Ram Chen is the blueprint’s running example: ~42 days of simulated Oura + Apple Health, two Quest lab reports, a four-day shift away from personal baseline, and an evening-walk association with overnight HRV.

## Architecture

| Layer | Location | Role |
| --- | --- | --- |
| UI | `src/app`, `src/components` | App Router screens |
| Demo state | `src/lib/store.tsx` | Browser localStorage; reset-able |
| Sample data | `src/lib/data` | Observations, labs, Ram profile |
| Baseline / status | `src/lib/engines/baseline.ts`, `status.ts` | Deterministic, versioned `status-engine@0.1-demo` |
| Behavior ranking | `src/lib/engines/behaviors.ts` | Today’s ONE and Repeat ONE |
| Associations | `src/lib/engines/associations.ts` | Association language only |
| Coach | `src/lib/services/coach.ts`, `src/app/api/coach/route.ts` | Explains engine output; optional live wording |
| Watch ingest | `src/lib/services/wearable.ts` | Simulated connect / sync / merge (replace this file for a real API) |
| Freshness | `src/lib/engines/freshness.ts` | Shared 4-hour threshold vs demo clock 18:40 UTC |

The consumer sees **Thriving / Stable / Shifting / Needs Attention**, not a 0–100 health score.

## What is real vs simulated

**Computed in the demo (real logic, sample inputs):**

- Personal baselines (rolling median / MAD)
- My Wellness Status and explainable drivers
- Today’s ONE ranking from a curated low-risk library
- Repeat ONE evidence rules
- Trend ranking vs personal baseline
- Behavior associations (labeled as associations, not causation)
- Coach answers grounded in those engines

**Simulated, and labeled as such:**

- Pulse Watch connect/sync (no Bluetooth, OAuth, or vendor API)
- Junction / Oura / Apple Health / WHOOP / Garmin / Fitbit catalog toggles
- Lab PDF OCR (upload attaches a sample parse with provenance)
- Supabase Auth, Postgres, RLS, subscriptions
- Live LLM wording unless `OPENAI_API_KEY` is set

HealthTrack 1.0 does not diagnose, treat, prevent, or detect disease. Thresholds are demo calibrations; the blueprint states they are not clinically validated.

## Environment variables

See `.env.example`. None are required.

| Name | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | No | Optional rewrite of coach wording on the server |
| `OPENAI_MODEL` | No | Defaults to `gpt-4o-mini` |

Never put secrets in client code. Keys are read only in `src/app/api/coach/route.ts`.

## Deploy on Vercel

The app is a standard Next.js App Router project. Framework: Next.js. Build command: `npm run build`. No required environment variables.

A Vercel project named **healthtrack-demo** was created on the `edxnoels-projects` team (`prj_z1L9DNBbM8RwkKLgdqzf8NuQqy3T`). The local CLI was logged out, so a live URL was not published from this session. Link and deploy from this directory:

```bash
npx vercel login
npx vercel link --yes --project healthtrack-demo --scope edxnoels-projects
npx vercel
```

That creates a **preview** URL. Do not run `vercel --prod` unless you intend to overwrite production.

Deep links (`/today/status`, `/trends/sleep`, `/progress/evening-walk`, `/profile/labs/lab-2026-09`, `/coach`, `/watch`) are App Router routes and should refresh without a 404 on Vercel.

## Limitations

- Demo clock is pinned to **16 October 2026, 18:40 UTC** so Ram’s four-day shift and 4-hour freshness window stay consistent.
- Pulse Watch connection is simulated. A real wearable API would replace `src/lib/services/wearable.ts`.
- Disconnecting the watch does not delete imported readings; Reset demo reseeds Ram.
- Organization, school, and provider dashboards are out of 1.0 UI scope.
- Optional OpenAI calls fail closed to the local engine.
