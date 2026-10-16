# Final product audit

Source of truth: `docs/HT_1.0_V2_Blue_print_Oct_2026.pdf` (16 pages, October 2026), reconciled with `docs/blueprint-analysis.md`.

HealthTrack 1.0 is a personal wellness guidance system for a U.S. direct-to-consumer user. It learns a personal baseline, shows a state (not a 0–100 score), names one low-risk behavior, and remembers which behaviors appear associated with better signals. Corporate, school, and provider dashboards are later surfaces and are out of this demo.

Audit date: 16 October 2026. Demo clock: 16 October 2026, 18:40 UTC.

## Requirements matrix

| Requirement | Where it appears | Status | Evidence | Corrective action | Final verification |
| --- | --- | --- | --- | --- | --- |
| Philosophy: know your normal, notice a shift, do one thing, repeat what works | `/` and Today | Complete | Homepage and Today explain the loop in product language | Homepage rewritten so a first-time visitor can see who it is for, what is calculated, and what is simulated | Homepage rendered at 1280 and 390px; no horizontal overflow |
| Wellness is the center; Sleep, Recovery, Nutrition, Fitness, Labs are lenses | Today pillars, Trends | Complete | Five lenses, status is not a fifth destination | None | Today and Trends render the lenses from the shared model |
| Personal baseline (median/MAD), peer and general references secondary | `/today/status`, `/trends/[pillar]` | Complete | Pillar pages show My baseline, Peer reference, General | Status page now states that My Baseline is primary and links to the layers | `/today/status` shows the note and the link |
| My Wellness Status: Thriving / Stable / Shifting / Needs Attention, direction, confidence | Today, `/today/status` | Complete | Ram is Shifting, established baseline, direction lower | Recency was hardcoded at 10 hours | Status data quality now says about 11 hours, matching the 07:12 last sync |
| Exactly one Today’s ONE from a ranked low-risk library | Today, `/today/one` | Complete | Bedtime ranks first for Ram; ranking factors are shown | None | Accept, snooze, decline, and replace controls are present |
| Decline, replace, snooze, and a reason when a behavior is not feasible | Today, `/today/one`, Progress detail | Partial, then fixed | Decline used a canned reason and the form stayed open after the next ONE appeared | Reason field added; prompt remounts when the behavior changes | Declining bedtime with “Late meeting” stored the reason, showed the next ONE, and closed the form. History on `/progress/normal-bedtime` listed the reason |
| Repeat ONE only after personal evidence | Today, Progress | Complete | Evening walk is Repeat ONE; association language is explicit | None | 13 walk evenings on seed data; 14 after a watch catch-up |
| Outcome labeled Yes / No / Uncertain as association | `/progress/[behaviorId]` | Complete | Bedtime outcome is Uncertain (association) | None | Opened `/progress/normal-bedtime` |
| Trends ranked vs personal baseline, pillar drill-down | `/trends`, `/trends/sleep`, `/trends/recovery` | Complete | Ranked deviations and charts use the same observations as Today | None | HTTP 200; earlier browser pass showed steps and HRV matching Today |
| Progress: library, adherence, associations, weekly and monthly reflection | `/progress` | Partial, then fixed | Weekly reflection existed; monthly view did not | October completed-attempt count added from the same adherence records | “October so far: 4 completed attempts” rendered after reset |
| Profile, devices, labs with provenance, privacy, demo entitlement | Profile routes | Complete | Simulated Junction catalog, sample lab parse, local consent | Pulse Watch is the interactive ingest; catalog toggles stay labeled simulated | HTTP 200 on profile, devices, labs, lab detail, privacy |
| AI Health Coach explains the engine, does not diagnose, stores feedback | `/coach`, `/api/coach` | Partial, then fixed | Answers come from the local engine; optional OpenAI rewrite is server-only | Useful / Not useful stored on the coach message | Asked “Why is my status”; reply cited Shifting; feedback `useful` persisted in localStorage |
| Onboarding covers the 11 blueprint steps without a real account | `/onboarding` | Complete | Welcome through Learning your baseline, with skip into Ram | None | Route returns 200. Not re-walked field by field in this pass |
| Hardware-neutral simulated watch that writes the shared store | `/watch`, Today freshness bar, nav | Complete | Connect, sync, disconnect, history, failure, idempotent ids | Watch face HRV now uses today’s record instead of a fixed 41 ms | Seed face showed 40 ms. After sync: Up to date, 41 ms, 2 new / 0 updated. Repeat sync does not duplicate (unit test and prior browser pass) |
| Safety and non-diagnostic language | Status, Today, Coach, banner | Complete | Disclaimer and association wording are on the relevant screens | None | Visible on status and coach |
| Persistence across refresh | `localStorage` `healthtrack.demo.v1` | Complete | Connection, imports, adherence, coach feedback | v1 records migrate to v2 | Decline reason and coach feedback survived navigation. Reset restores Ram |
| Live Supabase auth, RLS, payments, real Junction, live OCR | Not in the client | Blocked by design | Blueprint names them for production; demo must run without credentials | Labeled simulations only | Demo runs with no env vars. `OPENAI_API_KEY` is read only in the server route |
| Org, school, and provider dashboards | Not in 1.0 UI | Out of scope | Blueprint marks these Later | None | Not built |

## Fixes in this pass

- Status recency follows `watch.lastSyncAt` and the shared 4-hour clock. Ram’s morning sync is about 11 hours old, not a hardcoded 10.
- Declining Today’s ONE asks why and stores that reason on the adherence event.
- Coach replies can be marked useful or not useful. The welcome line is not rated until it is a stored message.
- Pulse Watch face shows the current day’s HRV.
- Progress shows how many attempts were completed in October, next to the weekly reflection.
- Homepage copy now says what the product does, who it is for, what the visitor can open, and which parts are simulated.

## Homepage copy

The previous homepage restated the cover slogan as a three-item list and described Ram as “the blueprint’s running example.” The new page keeps the product idea and drops the slogan list.

- Headline: “Know your normal. Then do one thing about it.”
- Supporting copy names the actual inputs (sleep, recovery, activity, occasional labs) and the single daily behavior.
- A second paragraph says it is for personal wellness tracking, not a clinic visit or an employer report, and that it does not diagnose.
- Calls to action match the app: “Open Ram’s Today” and “Start with an empty profile.”
- The sample card uses the same bedtime and Repeat ONE the engines show for Ram.
- The footer says wearables, lab parsing, and coach wording are simulated, and that Pulse Watch writes into the same records.

Checked at 1280×900 and 390×844. No horizontal overflow.

## Tests run

| Command | Result |
| --- | --- |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| `npm test` (6 wearable/freshness tests) | Pass |
| `npm run build` | Pass, twice. `/watch` and nested routes included |

Browser, production server at `http://localhost:3000`:

- Homepage copy and both viewports.
- Open Ram’s Today.
- Freshness “Last updated 11 hours ago.”
- Status page recency “about 11 hours.”
- Decline with a reason, next ONE appears, form closes, reason on the behavior page.
- Reset restores the bedtime ONE and the stale watch label.
- Coach question and useful rating.
- Watch sync: syncing state, then Up to date, HRV 41 ms, 2 new records.
- HTTP 200 for `/`, `/today`, `/today/status`, `/today/one`, `/trends`, `/trends/sleep`, `/trends/recovery`, `/progress`, `/progress/evening-walk`, `/profile`, `/profile/devices`, `/profile/labs`, `/profile/labs/lab-2026-09`, `/profile/privacy`, `/coach`, `/watch`, `/onboarding`.
- Unknown path returns 404.

No new server errors were printed during these requests. Optional `OPENAI_API_KEY` is unset; the coach still answered from the local engine.

## Remaining limitations

- Demo clock is pinned to 16 October 2026, 18:40 UTC.
- Pulse Watch, catalog wearables, and lab parsing are simulated. A real wearable API would replace `src/lib/services/wearable.ts`.
- There is no live account, database, or payment. Consent is stored in the browser.
- Organization, school, and provider dashboards are not in 1.0.
- Onboarding was not clicked through all 11 steps in this pass. The route and step list are present.
- Vercel CLI is logged out and this folder has no git remote, so a live deployment URL was not produced in this session.
