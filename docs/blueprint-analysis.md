# HealthTrack 1.0 — Blueprint Analysis

Source: `docs/HT_1.0_V2_Blue_print_Oct_2026.pdf` (16 pages, October 2026).  
Document type: Master product blueprint + PRD + investor business case. Marked as a working strategy document whose assumptions are to be validated in beta.

This file is the implementation specification for the interactive demo.

---

## 1. Product overview and intended audience

**Product:** HealthTrack 1.0 — a **Personal Wellness Guidance System**, not a health-data dashboard.

**Philosophy (cover):** *Know your normal. Notice what matters. Do ONE thing. Repeat what works.*

**Central question the product asks:** “What is your body telling us today — and what is the most useful thing you can do about it?”

**Positioning shift (p.2):** aggregation of health data is becoming commodity. HealthTrack’s promise is that it understands what is changing in the body, identifies what may be influencing it, and helps the user improve wellness **one behavior at a time**.

**Primary launch customer:** U.S. direct-to-consumer wellness user.

**Future surfaces (not in 1.0 UI):** corporate wellness, schools/athletic programs, provider-authorized longitudinal views.

**1.0 scope explicitly named:** hardware-neutral data aggregation, parsed labs, Personal Baseline Intelligence, My Wellness Status, Today’s ONE, Repeat ONE, and AI Health Coach.

**2.0 (out of demo scope except as labeled future):** biomarker testing partnerships, deeper longitudinal biomarker intelligence, behavior experiments, organizational dashboards, provider workflows.

Cover diagram: Wellness (internally a wellness-readiness construct) sits at the center, supported by Sleep, Recovery, Fitness & Activity, and Nutrition. Later PRD text is explicit that the **consumer sees a state and explanation, not a 0–100 health score**. The demo follows the later PRD.

---

## 2. Core problem the product solves

Detection without behavior change is “just earlier anxiety.”

Existing products occupy adjacent but different jobs:

| Product class | Job |
| --- | --- |
| Oura | Insights |
| WHOOP | Recommendations / action plans |
| Apple | Aggregation of health data |
| Function | Deep biomarker information |

HealthTrack’s job is the closed loop:

**Insight → Decision → Behavior → Response → Learn what works for this person.**

The user needs:

1. A personal definition of “normal” (not only population ranges).
2. A clear signal when they are moving away from that normal.
3. Exactly one feasible, low-risk behavior for today.
4. A memory of which behaviors appear associated with better outcomes for them.

---

## 3. Principal features and differentiators (explicit in the blueprint)

1. **Wellness as the center, not a fifth pillar.** Sleep, Recovery, Nutrition, Fitness & Activity are supporting lenses. Labs + wearables + lifestyle + user context sit underneath.
2. **Personal Baseline Intelligence.** Three reference layers, never conflated:
   - **My Baseline** (primary): rolling, quality-controlled personal distribution.
   - **Peer Reference** (secondary): age/sex and only scientifically validated factors.
   - **General Reference** (secondary): population / laboratory intervals.
   - Ethnicity is not applied mechanically to every metric.
3. **My Wellness Status** — deterministic, versioned, auditable engine. LLM explains; it does not invent the state. Consumer-facing states: **Thriving, Stable, Shifting, Needs Attention**, plus 7-day direction and confidence.
4. **Today’s ONE** — exactly one highest-priority feasible low-risk behavior, with “Why this?” and adherence control. Ranking: relevance × evidence × expected personal benefit × feasibility × confidence × preference, penalized for burden / risk / uncertainty.
5. **Repeat ONE** — a previously attempted behavior with enough positive personal evidence. Ranking: adherence history × consistency of associated response × recency × confidence × feasibility. Appears only after minimum evidence rules.
6. **Adaptive Behavior Intelligence / Personal Response Model.** Population knowledge + user data + historical response → personalized intervention. Observed response is labeled **association, not causation**.
7. **AI Health Coach** — context-aware, priority-preserving, transparent about measured vs inferred vs general evidence, escalation-aware, non-diagnostic in 1.0, auditable.
8. **Hardware-neutral integrations** (Junction / wearables) and **lab PDF ingestion with provenance**.
9. **Safety rules** that suppress or redirect recommendations when a signal is outside general-wellness scope.
10. **Explain, don’t diagnose.** General-wellness language only.

Strategic wedge copy: **My Wellness Status → Today’s ONE → Repeat ONE → learn what works for me.**

---

## 4. Primary user journey (entry → key outcome)

1. **Welcome:** HealthTrack learns your normal and helps you improve one behavior at a time.
2. **Onboarding:** goals → account/consent/privacy → personal profile → diet/meds (skippable) → typical day → connect data → optional lab upload → nutrition/recovery questions → notification/coaching preference → “Learning Your Baseline.”
3. **Today:** see My Wellness Status (state, 7-day direction, confidence) and compact pillar states.
4. **Understand why:** tap status or a pillar for an explanation grounded in personal baseline deviation, persistence, cross-signal agreement, and data quality.
5. **Act:** accept, decline, replace, or snooze **Today’s ONE**; mark adherence.
6. **Repeat what works:** if evidence rules are met, see **Repeat ONE**.
7. **Trends:** “What’s changing?” ranked deviations from personal baseline; drill into pillars and labs; see association language + confidence.
8. **Progress:** behavior attempts, adherence, observed associations, Personal Behavior Library, weekly reflection. Core promise: *we are learning what appears to work for you.*
9. **Coach:** ask why / what next without generating a laundry list or diagnostic claims.
10. **Loop:** over days, the system updates baseline confidence and which behaviors qualify as Repeat ONE.

**Demo protagonist from the blueprint:** “Ram” — the PRD’s running example (sleep ~7h 18m, RHR 61, HRV 47, ~7,800 steps, energy 7.4, stress 4.1; a 4-day shift away from baseline; HbA1c trending up; evening walking associated with better overnight recovery).

---

## 5. Required pages, screens, UI components, and interactions

**Primary navigation:** Today | Trends | Progress | Profile.  
**AI Health Coach** is a persistent contextual action from Today and Trends, not a fifth analytics tab.

### Entry
- Product purpose in one screen.
- Path A: enter the prepopulated Ram demo (investor/customer-ready).
- Path B: abbreviated onboarding that still covers the 11-step intent.
- Reset / replay.

### Onboarding (11 steps in the PRD)
1. Welcome  
2. Goals and priorities  
3. Account + consent + privacy choices (demo: local profile, no mandatory real auth)  
4. Personal profile: age, sex, height, weight, optional context  
5. Dietary preferences, restrictions, allergies, medications/supplements (skip OK)  
6. Typical day: sleep, activity, meals, schedule, stress  
7. Connect data: supported wearable sources + permissions  
8. Upload recent lab report (optional / defer)  
9. Nutrition and recovery baseline questions  
10. Notifications and coaching preference  
11. Learning Your Baseline: explain confidence-building period and what Today will show  

### Today
- Header: greeting, date, Coach access.
- My Wellness Status: Thriving / Stable / Shifting / Needs Attention; 7-day direction; confidence (Building / Moderate / Established).
- Supporting lenses: Sleep, Recovery, Nutrition, Fitness & Activity, Labs — direction vs personal baseline; tap for explanation.
- Today’s ONE: behavior, Why this?, accept / decline / replace / snooze, adherence control.
- Repeat ONE: only if evidence rules pass.
- Must **not** become a dense dashboard.

### Status / pillar detail
- Drivers: deviation, persistence, agreement, data quality, context.
- Trace recommendation to inputs/rules (explainability NFR).
- Distinguish My Baseline vs peer vs general reference.

### Trends
- Starts with “What’s Changing?”
- Ranked meaningful deviations from personal baseline.
- Drill-down by pillar and labs.
- Cross-pillar insights with confidence and association language.

### Progress
- Behavior history, adherence, observed associations.
- Personal Behavior Library.
- Weekly/monthly reflection.
- Outcome of a behavior labeled Yes / No / Uncertain (association).

### Profile
- Goals, demographics, preferences.
- Devices / data sources (connect, disconnect, permissions).
- Lab uploads and parsed results with provenance.
- Privacy, consents, subscription/entitlements (demo).

### AI Health Coach
- Explain current status, baseline, trends, labs, goals, prior ONEs, adherence.
- Defaults to the highest-priority issue.
- Distinguishes measured data, inferred relationships, general evidence, uncertainty.
- Escalation-aware; non-diagnostic.
- User feedback on answers.

### Interaction states
Loading, empty (cold start / still learning), success, validation, error, disconnected source, missing wearable days, lab parse review.

---

## 6. Important entities, data fields, integrations, and dependencies

**Entities named in the data model (section 11):**  
users/profiles, organizations/memberships/roles, consents/permissions, data_sources/devices, raw_observations/normalized_metrics, lab_reports/lab_results, baseline_snapshots/baseline_confidence, wellness_status_snapshots, behavior_library, recommendations, behavior_commitments/adherence_events, outcome_windows/behavior_associations, coach_sessions/safety_events, subscriptions/entitlements.

**Status engine inputs:** signal deviation, persistence, cross-signal agreement, data quality, context (travel, illness, menstrual context, unusual schedule, self-report), safety rules.

**Illustrative formula (not clinically validated; thresholds for beta):**  
`DomainDeviation = sum(w_i * r_i * p_i * f(d_i)) / sum(w_i * r_i)`  
where `d_i` is a robust rolling personal deviation (median / MAD).

**Baseline confidence:** Building → Moderate → Established, based on valid days and source consistency. Cold start uses profile + peer/general context and must be labeled “still learning.”

**Integrations named:**
- Supabase Auth / Postgres / Storage / RLS (production architecture).
- Junction for wearable/health data.
- Lab PDF ingestion/parsing.
- Provider-agnostic model gateway (OpenAI / Gemini / others).
- Vercel for web demo/launch.

**Client:** React, mobile-responsive; native later.

---

## 7. What must work in the demo vs what can be simulated

### Must work (clickable, internally consistent, no API keys required)

- Entry → Today with wellness status computed from sample observations (not hardcoded copy that disagrees with the numbers).
- Personal baselines, deviations, confidence labels.
- Compact pillar states and drill-downs.
- Exactly one Today’s ONE from a ranking function over a curated low-risk library.
- Accept / decline / replace / snooze / adherence, with Progress updating.
- Repeat ONE only when evidence rules are met.
- Trends ranked by personal-baseline deviation.
- Progress: history, associations (association language), behavior library, a weekly reflection.
- Profile: inspect/edit demo profile, simulated device connect/disconnect, lab report review.
- Coach answers grounded in the same status/ONE engines, with safety language.
- Reset to the Ram sample.
- Deep links for Today, Trends, Progress, Profile, Coach, labs, pillar and behavior detail.
- Explicit labeling of sample / simulated data.

### Simulated behind clean interfaces (do not present as live)

- Junction wearable connections (Oura, Apple Health, WHOOP, Garmin, etc.).
- Live lab PDF OCR/parsing (offer a sample parsed report plus a “simulate parse of uploaded file” path).
- LLM wording (deterministic explanation service; optional live model later via env).
- Supabase auth, multi-tenant RLS, subscriptions/payments.
- Real clinical validation of thresholds (blueprint says they are not yet validated).
- Organization / employer / provider dashboards (1.0 DTC only; schema may be represented, UI not launched).

### Out of 1.0 demo

- Disease detection/prevention/treatment claims.
- Mechanical ethnicity adjustments on every metric.
- 2.0 biomarker marketplace, org dashboards, provider workflows.

---

## 8. Ambiguities and implementation assumptions

| Topic | Blueprint | Demo assumption |
| --- | --- | --- |
| Visual styling | Not specified beyond tables/diagrams | Distinct calm wellness UI (forest ink, warm paper, terracotta for ONE). State labels always accompany color. |
| Auth | Supabase Auth in production architecture | No mandatory account. Local demo profile. Consent screens collect choices without creating a real identity provider session. |
| “Wellness-Readiness Score” on cover vs “no 0–100 score” in PRD | Conflict | Follow the algorithmic PRD: states + explanation, no consumer health score. |
| Thresholds | “Must be calibrated during beta; not clinically validated.” | Transparent demo thresholds in a versioned engine (`status-engine@0.1-demo`). |
| User name “Ram” | Running example | Prepopulated demo person **Ram Chen**, 44, with the blueprint’s baseline and 4-day shift. |
| Today’s ONE vs Repeat ONE in examples | Bedtime (4-day shift) vs post-dinner walk (HbA1c + history) | Engines should naturally yield recovery-focused bedtime as Today’s ONE and evening walk as Repeat ONE given Ram’s data. |
| Junction / OpenAI keys | Named | Demo runs fully offline of those services. Optional `OPENAI_API_KEY` may refine coach wording; never required. |
| Multi-tenant roles | “Present early” in data model | Types include `organization`/`role`; DTC demo uses a single personal workspace. |
| Date of “today” | Not specified | Demo clock pinned to **16 Oct 2026** so the 4-day shift and lab dates stay consistent. |
| Cold-start path | Required | Onboarding without connecting devices shows Building confidence and conservative peer/general references. |

### Implementation checklist (build order)

1. Types, sample dataset (Ram, 42 days, labs, adherence history), baseline + status + ranking engines.
2. Demo state store (local, reset-able) with service interfaces for wearables, labs, coach.
3. Entry + onboarding.
4. App shell + Today (status, pillars, ONE, Repeat ONE) + detail routes.
5. Trends + pillar/lab drill-down.
6. Progress + behavior library + reflection.
7. Profile, devices, labs, privacy.
8. Coach (contextual, safety-aware).
9. README, `.env.example`, Vercel-ready production build.
10. Verify journeys, nested routes, console, responsive layouts.
