# HealthTrack scoring specification

Algorithm version: `wellness-v1.0`

`wellness-v1.0` is unchanged because no released official score was stored under that identifier. The previous implementation deleted a same-day row whenever the exact score was null, and the in-memory tests do not count as released scores. Older `wellness-aggregate@1.0` rows stay in the database and are excluded from personal comparisons.

This score is a nonclinical wellness indicator based on recorded information and saved goals. It is not a diagnosis and it is not a medically validated measurement.

## Pillar weights

| Pillar | Weight |
| --- | --- |
| Nutrition | 25 |
| Sleep | 30 |
| Activity | 25 |
| Recovery | 20 |

`exact score = sum(eligible pillar score × weight) / sum(eligible weights)`

The displayed score is `Math.round(exact score)`. A missing pillar is omitted, not scored as zero. At least three eligible pillars are required (`MINIMUM_ELIGIBLE_PILLARS = 3`).

A pillar is eligible only when every one of its components has a score. Components are not renormalized.

## Nutrition

Component weights: meal logging consistency 40, nutrition goal progress 35, hydration 25.

Meal logging target is an integer from 1 to 6.

`min(100, distinct valid meals / meal target × 100)`

Duplicate imports with the same source and source record id count once. Zero logged meals against a saved target scores 0. The explanation states that this measures tracking adherence, not nutritional quality.

Calorie target is a positive daily number.

`100 × max(0, 1 − abs(recorded calories − calorie goal) / calorie goal)`

Recorded calories are the day's total only when the food diary is complete: the meal target is met and every counted meal has a numeric calorie value. An incomplete diary leaves this component unavailable.

Hydration uses the same goal-progress formula. It requires a saved hydration target and at least one drink log. A missing drink log is not zero. The 2000 ml placeholder in the tracker form is not a saved target.

## Sleep

Component weights: duration 70, consistency 30.

Sleep-duration goal is a positive number of hours. Onboarding shows 8 as an editable starting value and saves it when the user continues. Skipping that step does not save 8. Profile saves 8 only when the user chooses “Use 8 hours” or types a value.

`100 × min(1, recorded sleep hours / goal sleep hours)`

One valid sleep session supplies the recorded hours. Overlapping sessions are not merged, and more than one session from the chosen source makes that night invalid.

Sleep consistency uses the previous seven completed local days, not the score date. At least four nights must have one valid start time.

The deviation is the median absolute circular clock difference, in minutes, between those start times and the profile target bedtime.

`100 × max(0, 1 − median deviation minutes / 120)`

The 120-minute boundary is the named constant `SLEEP_DEVIATION_BOUNDARY_MINUTES`.

## Activity

Component weights: daily activity goal 70, movement consistency 30.

The user chooses one primary goal: steps or active minutes, plus a positive target. No default step count is applied.

`100 × min(1, recorded activity / activity goal)`

Movement consistency uses the previous seven completed local days. At least four of those days need valid coverage.

`100 × eligible days meeting the goal / eligible days observed`

A day with no record is left out of both counts. It is not confirmed zero activity. Overlapping workouts invalidate that source instead of being summed. Manual and wearable totals are never added.

## Recovery

Component weights: energy 40, fatigue 30, soreness 30.

Energy: `value / 10 × 100`. Fatigue and soreness: `(10 − value) / 10 × 100`, which is `100 − rating × 10` for soreness. Ratings must be from 0 to 10.

Stress is stored and is not used as soreness. The recovery pillar needs energy, fatigue, and soreness. The latest complete check-in for the local day is used. If timestamps match, the lexicographically smaller id wins.

## Source reconciliation

Each of hydration, sleep, and activity can store a preferred source of `manual` or `companion`.

A valid preferred source is used alone. If it is missing or invalid, the other source is used only when that source has valid coverage and provenance. If no preference is set and both sources are valid, the component is unavailable. Records imported with the same source and source record id are kept once. Source attribution is retained on the chosen value.

## Personal and population comparisons

Personal comparison needs 28 saved scores from `wellness-v1.0` (`PERSONAL_BASELINE_MIN_SCORES`). Fewer than that shows “Your personal baseline is still building.” The comparison does not replace the official score.

Population comparison is always “Population comparison unavailable.” No cohort is configured.

Biomarker values and cycle entries are not inputs. Both invariance flags stay false.

## Provenance

Each assessment records the user id, score date, algorithm version, eligible pillars, pillar scores, applied weights, input ids, sources, and calculation time. A numeric result is stored in `wellness_score`. Users cannot write that table. Log edits recalculate the current version for that day. Cycle edits do not.

## Eligibility the user can see

Today explains each component. A pillar stays missing, with the reason, until its goal and records satisfy the rule above. Common reasons are: no meal target, an incomplete food diary, no saved hydration target or drink log, no sleep-duration goal, fewer than four valid nights, no activity goal, fewer than four covered activity days, overlapping sources, or a recovery check-in without soreness.
