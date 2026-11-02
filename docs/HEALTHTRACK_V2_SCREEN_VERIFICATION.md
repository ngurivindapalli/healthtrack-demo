# HealthTrack V2 screen verification

Every original Master Screen Library ID is listed once. Status reflects the local application after the V2 pass, not the AI Studio mock.

| ID | Status | Entry | Verification |
| --- | --- | --- | --- |
| V2-001 | IMPLEMENTED | V2-001  Welcome / Get Started  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-002 | IMPLEMENTED | V2-002  Create Account  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-003 | IMPLEMENTED | V2-003  Sign In  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-004 | BLOCKED | V2-004  Email Confirmation  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-005 | PARTIALLY_IMPLEMENTED | V2-005  Forgot Password  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-006 | PARTIALLY_IMPLEMENTED | V2-006  Reset Password  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-007 | PARTIALLY_IMPLEMENTED | V2-007  Authentication Error / Session Expired  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-008 | PARTIALLY_IMPLEMENTED | V2-008  Wellness Goals  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-009 | PARTIALLY_IMPLEMENTED | V2-009  Rank Personal Priorities  [Add / Verify] | Onboarding step saves goal order. It does not change score weights. |
| V2-010 | IMPLEMENTED | V2-010  Personal Details  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-011 | PARTIALLY_IMPLEMENTED | V2-011  Dietary Preferences  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-012 | PARTIALLY_IMPLEMENTED | V2-012  Food Allergies & Restrictions  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-013 | PARTIALLY_IMPLEMENTED | V2-013  Medications & Supplements (Optional)  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-014 | PARTIALLY_IMPLEMENTED | V2-014  Menstrual Cycle (Optional)  [Add / Verify] | Onboarding offers opt-in and can be skipped. Profile still holds the cycle log. |
| V2-015 | PARTIALLY_IMPLEMENTED | V2-015  Typical Day & Schedule  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-016 | PARTIALLY_IMPLEMENTED | V2-016  Notification Preferences  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-017 | PARTIALLY_IMPLEMENTED | V2-017  Nutrition Tracker Starting Baseline  [Add / Verify] | Optional starting note. It is not used as a score. |
| V2-018 | PARTIALLY_IMPLEMENTED | V2-018  Sleep Tracker & Recovery Tracker Starting Baseline  [Add / Verify] | Optional sleep and recovery notes. They are not used as scores. |
| V2-019 | MISSING | V2-019  Onboarding Review / Starting Point  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-020 | PARTIALLY_IMPLEMENTED | V2-020  Save and Resume Onboarding  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V1-42 | MISSING | V1-42  Connecting to Apple Health (Syncing)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-43 | MISSING | V1-43  Your Data Is Out of Date (Alert)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-56 | MISSING | V1-56  My Devices (Apple Watch & Whoop)  [Existing — MODIFY / SCOPE] | No dedicated flow was found for this entry. |
| V1-57 | PARTIALLY_IMPLEMENTED | V1-57  Data Sources & Sync Status  [Existing — MODIFY / SCOPE] | A related screen or API exists, but the library entry is not fully met. |
| V2-021 | PARTIALLY_IMPLEMENTED | V2-021  Choose Wearable or Manual Tracking  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-022 | MISSING | V2-022  Available Device Providers  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-023 | MISSING | V2-023  Device Permissions / Consent  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-024 | MISSING | V2-024  Connection Success / Failure  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-025 | PARTIALLY_IMPLEMENTED | V2-025  Manual Tracking Introduction  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-026 | PARTIALLY_IMPLEMENTED | V2-026  Disconnect / Reconnect Device  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V1-01 | MISSING | V1-01  Readiness Score (Master Inspiration)  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-02 | MISSING | V1-02  Home — Connected Wearable Data  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-03 | PARTIALLY_IMPLEMENTED | V1-03  Home — Manual Check-In Mode  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-04 | MISSING | V1-04  Readiness Pillar Breakdown  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-05 | PARTIALLY_IMPLEMENTED | V1-05  Today’s Priority (15-Min Walk)  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-06 | DEFERRED | V1-06  Today’s Priority (Live Walk Session)  [Existing — MERGE / VERIFY DISTINCT STATE] | P1 or P2. Not built in this pass. |
| V2-027 | PARTIALLY_IMPLEMENTED | V2-027  Morning Check-In Form  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-028 | PARTIALLY_IMPLEMENTED | V2-028  Check-In Saved / Edit  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-029 | PARTIALLY_IMPLEMENTED | V2-029  Wellness Tracker — One Score + Two Baseline Rings  [Add / Verify] | The official score and personal-baseline status can render. The population ring stays unavailable because no cohort exists. |
| V2-030 | BLOCKED | V2-030  Wellness Tracker Detail / Pillar Eligibility  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-031 | BLOCKED | V2-031  Healthy Population Baseline Explanation  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-032 | BLOCKED | V2-032  Personal Historical Baseline Explanation  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-033 | PARTIALLY_IMPLEMENTED | V2-033  Insufficient Data / Baseline Building  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-034 | BLOCKED | V2-034  Daily Wellness Summary  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-035 | PARTIALLY_IMPLEMENTED | V2-035  Daily Action & Repeatable Habit  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-036 | IMPLEMENTED | V2-036  Food Diary by Day  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-037 | IMPLEMENTED | V2-037  Manual Food Search & Add  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-038 | MISSING | V2-038  AI Food Estimate Review & Correction  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-039 | PARTIALLY_IMPLEMENTED | V2-039  Meal Detail / Edit / Delete  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-040 | IMPLEMENTED | V2-040  Hydration Log & Daily Target  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-041 | MISSING | V2-041  Nutrition Tracker Daily Summary  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-042 | MISSING | V2-042  Food Analysis Failure / Manual Fallback  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-043 | IMPLEMENTED | V2-043  Manual Sleep Entry  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-044 | PARTIALLY_IMPLEMENTED | V2-044  Sleep Tracker History & Edit  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-045 | PARTIALLY_IMPLEMENTED | V2-045  Recovery Tracker History & Edit  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-046 | PARTIALLY_IMPLEMENTED | V2-046  Missing Wearable Metrics Explanation  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-047 | PARTIALLY_IMPLEMENTED | V2-047  Workout Detail / Edit / Delete  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-048 | PARTIALLY_IMPLEMENTED | V2-048  Daily Activity History  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-049 | MISSING | V2-049  Activity Goal Editor  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-050 | MISSING | V2-050  Workout Import Duplicate Review  [Add / Verify] | No dedicated flow was found for this entry. |
| V1-40 | PARTIALLY_IMPLEMENTED | V1-40  Health Genie AI Coach (Start Hub)  [Existing — MODIFY] | A related screen or API exists, but the library entry is not fully met. |
| V1-41 | PARTIALLY_IMPLEMENTED | V1-41  Health Genie Active Chat Thread  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V2-051 | MISSING | V2-051  Recommendation Detail  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-052 | MISSING | V2-052  Save Recommendation to Plan  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-053 | MISSING | V2-053  Recommendation Follow-up / Feedback  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-054 | MISSING | V2-054  Conversation History  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-055 | MISSING | V2-055  AI Unavailable / Retry  [Add / Verify] | No dedicated flow was found for this entry. |
| V1-45 | PARTIALLY_IMPLEMENTED | V1-45  Progress & Consistency Tab  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-46 | PARTIALLY_IMPLEMENTED | V1-46  What’s Working For Me (Patterns)  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-47 | PARTIALLY_IMPLEMENTED | V1-47  Behavior Insight Detail  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-48 | PARTIALLY_IMPLEMENTED | V1-48  Save Weekly Reflection Focus  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V2-056 | MISSING | V2-056  Create / Edit Goal  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-057 | MISSING | V2-057  Goal Detail & Milestones  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-058 | MISSING | V2-058  Weekly Progress Summary  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-059 | MISSING | V2-059  Insufficient Trend History  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-060 | BLOCKED | V2-060  Forecast Method & Uncertainty Explanation  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V1-58 | PARTIALLY_IMPLEMENTED | V1-58  My Lab Results & Upload Report  [Existing — MODIFY / SCOPE] | A related screen or API exists, but the library entry is not fully met. |
| V2-061 | MISSING | V2-061  Lab Upload & Processing  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-062 | MISSING | V2-062  Extracted Lab Results Review  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-063 | MISSING | V2-063  Biomarker Detail / History  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-064 | MISSING | V2-064  Lab Parse Failure / Correction  [Add / Verify] | No dedicated flow was found for this entry. |
| V1-49 | PARTIALLY_IMPLEMENTED | V1-49  Profile & Settings Hub (Sarah)  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-50 | MISSING | V1-50  Goals & Challenges (Goals Tab)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-51 | MISSING | V1-51  Goals & Challenges (Challenges Tab)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-52 | MISSING | V1-52  Workout Profile & Weekly Target  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-53 | MISSING | V1-53  Typical Workout Duration (45-60m)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-54 | MISSING | V1-54  Choose Activities You Enjoy  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-55 | MISSING | V1-55  Where Do You Usually Work Out?  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-59 | PARTIALLY_IMPLEMENTED | V1-59  Notifications, Subscription & Privacy  [Existing — MODIFY] | A related screen or API exists, but the library entry is not fully met. |
| V1-60 | MISSING | V1-60  Beta Feedback (  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V2-065 | PARTIALLY_IMPLEMENTED | V2-065  Edit Personal Profile  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-066 | PARTIALLY_IMPLEMENTED | V2-066  Edit Health Preferences  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-067 | MISSING | V2-067  Notification Settings  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-068 | PARTIALLY_IMPLEMENTED | V2-068  Privacy / Permissions Management  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-069 | MISSING | V2-069  Account Security  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-070 | IMPLEMENTED | V2-070  Export My Data  [Add / Verify] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-071 | PARTIALLY_IMPLEMENTED | V2-071  Delete Account Confirmation  [Add / Verify] | A related screen or API exists, but the library entry is not fully met. |
| V2-072 | MISSING | V2-072  Help & Support  [Add / Verify] | No dedicated flow was found for this entry. |
| V2-073 | BLOCKED | V2-073  30-Day Trial Introduction  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-074 | BLOCKED | V2-074  Plan Comparison — Monthly / Annual  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-075 | BLOCKED | V2-075  Trial Activation / Status  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-076 | BLOCKED | V2-076  Checkout / Payment Confirmation  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-077 | BLOCKED | V2-077  Payment Failed / Restore Purchase  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-078 | BLOCKED | V2-078  Manage / Cancel Subscription  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-079 | BLOCKED | V2-079  Trial Expired / Access State  [Add / Verify] | Required rules or an external provider are absent, so this is not presented as complete. |
| V1-07 | MISSING | V1-07  Trends Hub (7-Day Overview)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-08 | MISSING | V1-08  Trends Hub (30-Day Monthly View)  [Existing — MERGE / VERIFY DISTINCT STATE] | No dedicated flow was found for this entry. |
| V1-09 | MISSING | V1-09  7-Day Readiness Outlook  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-10 | MISSING | V1-10  Building Your Outlook (3 of 5 Ready)  [Existing — MODIFY / SCOPE] | No dedicated flow was found for this entry. |
| V1-11 | MISSING | V1-11  Improve Data Action Checklist  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-12 | MISSING | V1-12  Improve Data — Popular Integrations  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-13 | MISSING | V1-13  Sleep Tracker Trends (7-Day Duration)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-14 | MISSING | V1-14  Sleep Tracker Trends (30-Day Heatmap)  [Existing — MERGE / VERIFY DISTINCT STATE] | No dedicated flow was found for this entry. |
| V1-15 | DEFERRED | V1-15  Sleep Stages & Hypnogram  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-16 | DEFERRED | V1-16  Sleep Consistency (82% Regular)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-17 | MISSING | V1-17  Recovery Tracker Trends (HRV & RHR)  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-18 | MISSING | V1-18  Recovery Tracker Trends (30-Day HRV Wave)  [Existing — MERGE / VERIFY DISTINCT STATE] | No dedicated flow was found for this entry. |
| V1-19 | PARTIALLY_IMPLEMENTED | V1-19  Manual Recovery Tracker Check-In Sliders  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V1-20 | MISSING | V1-20  Fitness & Activity Tracker Overview  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-21 | DEFERRED | V1-21  Workout Load Breakdown  [Existing — MODIFY] | P1 or P2. Not built in this pass. |
| V1-22 | DEFERRED | V1-22  Workout Load Indicators (AU Scale)  [Existing — DEFER ADVANCED METRICS] | P1 or P2. Not built in this pass. |
| V1-23 | MISSING | V1-23  Workout History (All Sessions)  [Existing — MODIFY] | No dedicated flow was found for this entry. |
| V1-24 | MISSING | V1-24  Log Workout (  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-25 | MISSING | V1-25  Add Workout / Exercise Picker  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-26 | MISSING | V1-26  Active Strength Training Logger  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-27 | MISSING | V1-27  Save Workout Summary  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-28 | MISSING | V1-28  Workout Saved! Confirmation  [Existing — KEEP + IMPLEMENT] | No dedicated flow was found for this entry. |
| V1-29 | DEFERRED | V1-29  Nutrition Tracker Trends & Macros  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-30 | DEFERRED | V1-30  Today’s Meal Plan (Full Day Estimate)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-31 | DEFERRED | V1-31  Today’s Meal Plan (Photo Log View)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-32 | DEFERRED | V1-32  Swap Meal (Smart Alternatives)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-33 | DEFERRED | V1-33  Meal Scan (Camera Viewfinder)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-34 | DEFERRED | V1-34  Meal Scanning (AI Analyzing Modal)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-35 | DEFERRED | V1-35  Meal Analysis (Overview & Recipe)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-36 | DEFERRED | V1-36  Manual Meal Analysis (Gram Steppers)  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-37 | DEFERRED | V1-37  Add Portion Bottom Sheet  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-38 | DEFERRED | V1-38  Log Confirmation Summary  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-39 | DEFERRED | V1-39  Meal Logged! Confirmation  [Existing — KEEP + IMPLEMENT] | P1 or P2. Not built in this pass. |
| V1-44 | PARTIALLY_IMPLEMENTED | V1-44  Not Enough Data Yet (Cold Start)  [Existing — KEEP + IMPLEMENT] | A related screen or API exists, but the library entry is not fully met. |
| V2-140 | IMPLEMENTED | V2-140  Cycle tracking invitation & informed opt-in  [Add — P0] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-141 | PARTIALLY_IMPLEMENTED | V2-141  Cycle setup: last period, typical length, variability, uncertainty  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-142 | PARTIALLY_IMPLEMENTED | V2-142  Cycle privacy and visibility preferences  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-143 | MISSING | V2-143  Cycle calendar: logged dates and estimated window  [Add — P0] | No dedicated flow was found for this entry. |
| V2-144 | PARTIALLY_IMPLEMENTED | V2-144  Log period start, end and flow (optional)  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-145 | PARTIALLY_IMPLEMENTED | V2-145  Daily cycle symptoms: cramps, fatigue, mood, appetite, sleep  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-146 | PARTIALLY_IMPLEMENTED | V2-146  Cycle history: review and edit entries  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-147 | DEFERRED | V2-147  Cycle overview: recorded vs estimated phase  [Add — P1] | P1 or P2. Not built in this pass. |
| V2-148 | DEFERRED | V2-148  Cycle trends: correlations with four wellness pillars  [Add — P1] | P1 or P2. Not built in this pass. |
| V2-149 | BLOCKED | V2-149  Cycle-aware Wellness Tracker explanation and two-ring baseline context  [Modify existing — P0] | Required rules or an external provider are absent, so this is not presented as complete. |
| V2-150 | DEFERRED | V2-150  Health Genie cycle-aware insight with evidence/uncertainty labels  [Modify existing — P1] | P1 or P2. Not built in this pass. |
| V2-151 | DEFERRED | V2-151  Cycle-aware notification preferences  [Add — P1] | P1 or P2. Not built in this pass. |
| V2-152 | PARTIALLY_IMPLEMENTED | V2-152  Irregular cycle / hormonal contraception / pregnancy / postpartum / perimenopause options  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-153 | PARTIALLY_IMPLEMENTED | V2-153  Insufficient history / uncertain predictions state  [Add — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-154 | IMPLEMENTED | V2-154  Cycle data export, deletion and consent withdrawal  [Add — P0] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-155 | DEFERRED | V2-155  Step-count source and daily step-goal detail  [Verify / enhance — P1] | P1 or P2. Not built in this pass. |
| V2-156 | DEFERRED | V2-156  GPS workout route permission and route detail (opt-in)  [Future — P2] | P1 or P2. Not built in this pass. |
| V2-157 | DEFERRED | V2-157  Optional wellness challenges and badges  [Future — P2] | P1 or P2. Not built in this pass. |
| V2-158 | DEFERRED | V2-158  Private-by-default community / leaderboard consent  [Future — P2] | P1 or P2. Not built in this pass. |
| V2-159 | DEFERRED | V2-159  Professional consultation referral / partner flow  [Future — P2] | P1 or P2. Not built in this pass. |
| V2-160 | DEFERRED | V2-160  Wearable heart-rate display with source and non-diagnostic caveat  [Verify / enhance — P1] | P1 or P2. Not built in this pass. |
| V2-161 | PARTIALLY_IMPLEMENTED | V2-161  Wellness Tracker: one score with two independently explained baseline comparison rings  [Modify — P0] | Score and personal-baseline copy are implemented. Population comparison has no reference data. |
| V2-162 | IMPLEMENTED | V2-162  Healthy population baseline unavailable / unvalidated comparison state  [Add state — P0] | Working route or persisted behavior was found and matches the entry enough to use. |
| V2-163 | IMPLEMENTED | V2-163  Personal baseline building / insufficient history state  [Add state — P0] | Shows the building message until 28 official scores exist. |
| V2-164 | PARTIALLY_IMPLEMENTED | V2-164  Independent Biomarker Tracker overview; no score contribution  [Modify — P0] | A related screen or API exists, but the library entry is not fully met. |
| V2-165 | DEFERRED | V2-165  Lab-to-tracker connected insight detail with provenance and freshness  [Add — P1] | P1 or P2. Not built in this pass. |
| V2-166 | DEFERRED | V2-166  Biomarker consent / permission for Health Genie context  [Add state — P1] | P1 or P2. Not built in this pass. |
| V2-167 | IMPLEMENTED | V2-167  Four-tracker eligibility and missing-data explanation  [Modify — P0] | Today explains each missing component, including goals, diary completion, history, coverage, and soreness. |
| V2-168 | IMPLEMENTED | V2-168  Cycle-context consent and revoke; no automatic score penalty  [Verify — P0] | Working route or persisted behavior was found and matches the entry enough to use. |
