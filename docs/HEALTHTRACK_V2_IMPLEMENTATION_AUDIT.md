# HealthTrack V2 implementation audit

Sources: `docs/HealthTrack_PRD_V2.docx` and `docs/HealthTrack_Master_Screen_Library_V2.docx` (23 October 2026).

The screen library has 168 entries. They are screens, states, and checks, not 168 routes. The entry-by-entry record is `docs/HEALTHTRACK_V2_SCREEN_VERIFICATION.md`.

Stack found before this pass: Next.js App Router, Better Auth, SQLite/libSQL, server routes under `src/app/api/v1`, client workspace state in `src/lib/store.tsx`. Primary navigation is already Today, Trends, Progress, and Profile. There is no Supabase project and no payment provider.

## Product requirements

| ID | Description | Status | Where | Gap | Priority | Acceptance |
| --- | --- | --- | --- | --- | --- | --- |
| PRD-01 | Register, sign in/out, reset, isolated sessions | PARTIALLY_IMPLEMENTED | `src/lib/auth.ts`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password` | Email delivery is blocked until Resend is configured. Session expiry has no dedicated screen; protected routes send the user to sign-in. | P0 | New and returning accounts route correctly. Cross-account log deletion is tested. |
| PRD-02 | Onboarding can resume and skip optional questions | PARTIALLY_IMPLEMENTED | `src/app/onboarding/page.tsx` | Priority ranking, starting notes, and optional cycle opt-in are saved with the existing steps. Rank does not change score weights. A separate manual-versus-device choice is still the existing connect step. | P0 | Name, age, and measurement consent are validated. Optional steps can be skipped. Completed accounts are not sent back through onboarding. |
| PRD-03 | Log, edit, and delete meals, hydration, sleep, activity, and recovery | IMPLEMENTED | `src/lib/services/manual-logs.ts`, `/today/track/[kind]` | Each tracker form can save, edit, and delete that account's rows. | P0 | Another account cannot edit or delete the row. The list reloads after a successful save. |
| PRD-04 | One deterministic 0–100 score from the four trackers only | IMPLEMENTED | `src/lib/services/pillar-components.ts`, `src/lib/services/wellness-score.ts`, Profile and onboarding goal fields | Approved V1 formulas, goals, source preference, and strict component eligibility are implemented. The official number appears when at least three pillars are complete. Population comparison remains unavailable. | P0 | Formula, history, duplicate, source, recovery, renormalization, determinism, version, account, cycle, and biomarker tests passed. |
| PRD-05 | Personal and population comparison rings | PARTIALLY_IMPLEMENTED | `src/components/wellness-panel.tsx` | Personal comparison uses saved official scores and shows the building message under 28 scores. No population cohort exists, so that comparison stays unavailable. Rings are not drawn. | P0 | The comparison does not replace the official score. |
| PRD-06 | Biomarkers stay independent of the score | PARTIALLY_IMPLEMENTED | `/profile/labs`, wellness response `labsAffectScore: false` | Upload, review, and parsing are not implemented. The separation is implemented by not scoring. | P0 | Adding or removing a lab cannot change a score because no score is calculated. |
| PRD-07 | Optional cycle consent, no phase penalty | PARTIALLY_IMPLEMENTED | `/profile/cycle`, `cycleContextForAuthorizedUse` | Opt-in, notes, entries, and deletion work. Predictions, calendars, and correlation charts are not built. | P0 | Context is unavailable to authorized coaching use when consent is off. |
| PRD-08 | Health Genie grounded in data, cannot overwrite the score | PARTIALLY_IMPLEMENTED | `src/lib/services/coach.ts`, `/coach` | Deterministic coach text and optional OpenAI wording exist. Saved-plan actions and recommendation follow-up are missing. | P0 | The model route cannot write health records or a score. |
| PRD-09 | 7- and 30-day trends from real data | PARTIALLY_IMPLEMENTED | `/trends`, `/progress` | Existing trend pages read stored observations and say when history is missing. Forecasts are not implemented. | P0 | Empty accounts do not receive fabricated history. |
| PRD-10 | Device sync without blocking manual mode | PARTIALLY_IMPLEMENTED | `/profile/devices` | Pairing codes, expiry, and revocation work. Live wearable sync is waiting on the companion app. Manual logs do not require a device. | P1 for sync, P0 for manual independence | The site does not invent a connected device. |
| PRD-11 | Export, delete, and account isolation | PARTIALLY_IMPLEMENTED | `/api/v1/me/export`, profile deletion, session-scoped queries | Export and deletion exist. File storage policies are not needed yet because lab files are not stored. | P0 | Export and logs use the session user id, not a client-supplied user id. |
| PRD-12 | Trial and subscription | BLOCKED | Profile copy only | No payment provider is configured. | P1 | No checkout is simulated. |

## Scoring decision

The existing engine in `src/lib/engines/status.ts` produces Thriving, Stable, Shifting, or Needs Attention. It is not a 0–100 Wellness Tracker and it was not reused as one. Until weights and eligibility rules are confirmed, `GET /api/v1/me/wellness` returns `status: "blocked"` and `score: null`.

## Verification

Screen statuses were assigned by inspecting routes and services, plus automated tests for manual-log isolation, cycle consent, and the V1 score. They were not all clicked in a browser. Counts are in the release report.
