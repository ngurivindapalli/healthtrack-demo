# HealthTrack V2 release report

## 1. Implementation summary

The V2 specifications were read and compared with the existing Next.js account app. Manual nutrition, hydration, sleep, activity, and recovery logs were added and stored per account. Optional cycle consent was added, and coaching context is withheld when consent is off. Data export was added.

`wellness-v1.0` now implements the approved V1 pillar formulas. The local database had no stored official scores, so the version identifier was kept. Older `wellness-aggregate@1.0` rows are still excluded from personal comparisons. An official number is saved when at least three pillars have every component. On this account the score stays unavailable until hydration, four sleep nights, four activity days, and a complete recovery check-in exist.

Subscriptions, photo meal analysis, lab parsing, GPS routes, leaderboards, and rewards were not built.

## 2. Modified files

- `src/db/index.ts` — manual log and cycle tables, created on startup.
- `src/lib/services/manual-logs.ts` — validated create, update, delete, and cycle consent.
- `src/lib/services/wellness-score.ts` and `src/lib/services/pillar-components.ts` — V1 pillar formulas, source preference, and provenance.
- `src/components/scoring-goals-fields.tsx` — goal controls on Profile and onboarding.
- `src/lib/services/workspace.ts` — health-data deletion includes the new tables.
- `src/app/api/v1/me/logs` — authenticated log API.
- `src/app/api/v1/me/cycle` — consent, entries, and deletion.
- `src/app/api/v1/me/wellness` — score status.
- `src/app/api/v1/me/export` — JSON download.
- `src/app/(workspace)/today/track/[kind]/page.tsx` — manual tracker screens.
- `src/app/(workspace)/profile/cycle/page.tsx` — optional cycle setup.
- `src/components/wellness-panel.tsx` — Today entry for the four trackers and the blocked score.
- `docs/HealthTrack_PRD_V2.docx` and `docs/HealthTrack_Master_Screen_Library_V2.docx` — the source specifications.

## 3. Database changes

Existing account tables gain `recovery_log.soreness`, `source_record_id` on meal, sleep, workout, and hydration logs, and `hydration_log.source`. Duplicate-column errors are ignored so startup can migrate twice. Scoring goals are stored in the profile workspace JSON.

No production database was changed. The local file had no `wellness_score` rows when the version decision was made.

## 4. Screen verification

All 168 library IDs are in `docs/HEALTHTRACK_V2_SCREEN_VERIFICATION.md`.

- IMPLEMENTED: 15
- PARTIALLY_IMPLEMENTED: 55
- MISSING: 56
- BLOCKED: 14
- DEFERRED: 28

V2-029 and V2-161 are partial because the population comparison has no cohort. V2-167 is implemented: Today explains why each component is missing.

## 5. Test results

Commands run after the V2 changes:

- `npm run typecheck` passed.
- `npm run lint` passed with no warnings after removing an unused import.
- `npm test` passed: 21 tests, 0 failed. Coverage includes every component formula, goal validation, incomplete diaries, sleep-history and activity-coverage minimums, source preference, duplicate reconciliation, multiple recovery check-ins, three-pillar renormalization, determinism, algorithm versioning, account isolation, and cycle and biomarker invariance.
- `npm run build` succeeded after the final missing-data wording change. The route list includes wellness, logs, and onboarding.

A signed-in browser pass confirmed Profile saves a meal target, calorie target, 8-hour sleep goal, and step goal without restarting onboarding. After reload, Today scored the saved meal and calories, explained the missing sleep record, missing steps, missing hydration target, and missing soreness, and still showed the personal baseline as building and population comparison as unavailable. The recovery form shows soreness separately from stress. The recovery form fit a 390px viewport without horizontal overflow. The other 168 states were not each clicked.

## 6. Remaining issues

- No validated population reference exists, so the population comparison stays unavailable.
- This account does not yet have the hydration, sleep-history, activity-coverage, and soreness inputs required for an official number.
- Email verification and password-reset delivery need Resend.
- Google sign-in needs OAuth credentials.
- Meal photo analysis and lab parsing are absent.
- In-memory rate limits are not shared across servers.

## 7. Deferred features

P1: wearable sync beyond pairing codes, photo meals, lab upload and review, Health Genie saved actions, notifications, subscriptions, cycle correlation charts.

P2: GPS routes, challenges, leaderboards, consultation marketplace, advanced workout-load metrics.

## 8. Release readiness

NOT READY — BLOCKERS REMAIN

The V1 score can be calculated when three pillars are complete, and that path is covered by tests. This account is not yet eligible. Email delivery, Google sign-in, payments, a hosted database, and a population reference are not configured. Critical security journeys were not re-verified in this pass.
