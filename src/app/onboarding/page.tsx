"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ScoringGoalsFields } from "@/components/scoring-goals-fields";
import { Button, Card, Field, Select, TextArea, TextInput } from "@/components/ui";
import { flushWorkspace, useDemo } from "@/lib/store";
import type { Sex } from "@/lib/types";

const STEPS = [
  "Welcome",
  "Goals",
  "Consent",
  "Profile",
  "Diet & meds",
  "Typical day",
  "Connect data",
  "Labs",
  "Nutrition & recovery",
  "Coaching",
  "Learning your baseline",
  "Priorities",
  "Starting baselines",
  "Cycle",
];

const GOAL_OPTIONS = [
  "Sleep consistency",
  "Recovery",
  "Metabolic wellness",
  "Steady energy",
  "Sustainable activity",
];

export default function OnboardingPage() {
  const router = useRouter();
  const {
    state,
    patchProfile,
    patchState,
    setOnboardingStep,
    completeOnboarding,
    ready,
    signedIn,
  } = useDemo();
  const step = Math.min(state.onboardingStep, STEPS.length - 1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [cycleOptIn, setCycleOptIn] = useState(false);
  const [sleepDraft, setSleepDraft] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!ready) return;
    if (!signedIn) router.replace("/sign-in");
  }, [ready, signedIn, router]);

  async function next(skip = false) {
    setError("");
    if (step === 2 && !state.consents.wearables) {
      setError("Consent to store companion-app measurements is required before continuing.");
      return;
    }
    if (step === 3) {
      if (!state.profile.displayName.trim()) {
        setError("Enter the name HealthTrack should use.");
        return;
      }
      if (state.profile.age < 13 || state.profile.age > 120) {
        setError("Age needs to be between 13 and 120.");
        return;
      }
    }
    if (step === 12 && !skip && sleepDraft === undefined && state.scoringGoals.sleepHoursGoal == null) {
      patchState({ scoringGoals: { ...state.scoringGoals, sleepHoursGoal: 8 } });
    }
    setSaving(true);
    if (step === 13 && cycleOptIn && !skip) {
      const response = await fetch("/api/v1/me/cycle", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ enabled: true, variability: "unsure" }),
      });
      if (!response.ok) {
        setSaving(false);
        setError("Cycle preference could not be saved. You can skip this step.");
        return;
      }
    }
    if (step >= STEPS.length - 1) completeOnboarding();
    else setOnboardingStep(step + 1);
    try {
      const saved = await flushWorkspace();
      if (!saved) {
        setError("This step could not be saved. Check your connection and try again.");
        return;
      }
      if (step >= STEPS.length - 1) router.push("/today");
    } catch {
      setError("This step could not be saved. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function back() {
    if (step === 0) {
      router.push("/");
      return;
    }
    setOnboardingStep(step - 1);
  }

  return (
    <div className="min-h-full bg-paper px-4 py-8">
      <div className="mx-auto max-w-xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <p className="display text-xl text-pine">HealthTrack</p>
          <Button variant="ghost" onClick={() => router.push("/")}>
            Exit
          </Button>
        </div>
        <p className="text-sm text-muted">
          Step {step + 1} of {STEPS.length}
          {step > 0 && step < 10 ? " · your answers stay on this account if you leave" : ""}
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-paper-2"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-label="Onboarding progress"
        >
          <div
            className="h-full bg-ink transition-[width] duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <h1 className="display mt-6 text-3xl">{STEPS[step]}</h1>
        <Card className="mt-5">{renderStep()}</Card>
        {error ? <p className="mt-4 text-sm text-attention" role="alert">{error}</p> : null}
        <div className="mt-5 flex justify-between gap-3">
          <Button variant="secondary" onClick={back} disabled={saving}>
            Back
          </Button>
          <div className="flex gap-2">
            {[4, 5, 7, 8, 11, 12, 13].includes(step) ? (
              <Button variant="ghost" onClick={() => void next(true)} disabled={saving}>
                Skip
              </Button>
            ) : null}
            <Button onClick={() => void next(false)} disabled={saving}>
              {saving ? "Saving…" : step >= STEPS.length - 1 ? "Open Today" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  function toggleGoal(goal: string) {
    const has = state.profile.goals.includes(goal);
    patchProfile({
      goals: has
        ? state.profile.goals.filter((item) => item !== goal)
        : [...state.profile.goals, goal],
    });
  }

  function renderStep() {
    switch (step) {
      case 0:
        return (
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              HealthTrack learns your normal from sleep, recovery, activity, and
              occasional labs, then names one low-risk thing to do today.
            </p>
            <p>
              The next screens ask for a name, a few goals, and optional context.
              You can skip anything that is not required. Nothing here is a
              diagnosis. Answers are saved to your account.
            </p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Choose what you want Today to pay attention to. These are personal
              priorities, not medical targets. Recovery keeps bedtime higher in
              the ranking.
            </p>
            <div className="grid gap-2">
              {GOAL_OPTIONS.map((goal) => {
                const on = state.profile.goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-medium transition-colors ${on ? "bg-ink text-surface" : "bg-paper text-ink hairline"}`}
                  >
                    {goal}
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-3 text-sm">
            <p className="leading-6 text-ink-soft">
              Profile answers and measurements are stored for this account on the server. This site does not read Apple Health. Companion measurements are stored only if you allow them below. You can delete the data later from Profile.
            </p>
            {(
              [
                ["wearables", "Companion app measurements stored on this account"],
                ["labs", "Lab report storage, if parsing is added later"],
                ["coaching", "Coaching explanations, including optional AI wording"],
                ["productAnalytics", "Product analytics (optional)"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={state.consents[key]}
                  onChange={(e) =>
                    patchState({
                      consents: { ...state.consents, [key]: e.target.checked },
                    })
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        );
      case 3:
        return (
          <div className="grid gap-3">
            <Field label="Preferred name">
              <TextInput
                value={state.profile.displayName}
                onChange={(e) => patchProfile({ displayName: e.target.value })}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age">
                <TextInput
                  type="number"
                  value={state.profile.age}
                  onChange={(e) => patchProfile({ age: Number(e.target.value) })}
                />
              </Field>
              <Field label="Sex">
                <Select
                  value={state.profile.sex}
                  onChange={(e) => patchProfile({ sex: e.target.value as Sex })}
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <TextInput
                  type="number"
                  value={state.profile.heightCm}
                  onChange={(e) => patchProfile({ heightCm: Number(e.target.value) })}
                />
              </Field>
              <Field label="Weight (kg)">
                <TextInput
                  type="number"
                  value={state.profile.weightKg}
                  onChange={(e) => patchProfile({ weightKg: Number(e.target.value) })}
                />
              </Field>
            </div>
            <Field label="Time zone" hint="Used to place measurements on your local calendar day.">
              <TextInput
                value={state.profile.timezone}
                onChange={(e) => patchProfile({ timezone: e.target.value })}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={() => patchProfile({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" })}
            >
              Use this device’s time zone
            </Button>
          </div>
        );
      case 4:
        return (
          <div className="grid gap-3">
            <Field label="Dietary preferences" hint="Skip any field you do not want to share.">
              <TextInput
                value={state.profile.dietaryPreferences.join(", ")}
                onChange={(e) =>
                  patchProfile({
                    dietaryPreferences: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Allergies">
              <TextInput
                value={state.profile.allergies.join(", ")}
                onChange={(e) =>
                  patchProfile({
                    allergies: e.target.value
                      .split(",")
                      .map((item) => item.trim())
                      .filter(Boolean),
                  })
                }
              />
            </Field>
            <Field label="Medications / supplements">
              <TextInput
                value={state.profile.medications}
                onChange={(e) => patchProfile({ medications: e.target.value })}
              />
            </Field>
          </div>
        );
      case 5:
        return (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Typical bedtime">
              <TextInput
                type="time"
                value={state.profile.typicalBedtime}
                onChange={(e) => patchProfile({ typicalBedtime: e.target.value })}
              />
            </Field>
            <Field label="Typical wake">
              <TextInput
                type="time"
                value={state.profile.typicalWake}
                onChange={(e) => patchProfile({ typicalWake: e.target.value })}
              />
            </Field>
            <Field label="Typical dinner">
              <TextInput
                type="time"
                value={state.profile.typicalDinner}
                onChange={(e) => patchProfile({ typicalDinner: e.target.value })}
              />
            </Field>
            <Field label="Work / school pattern">
              <TextInput
                value={state.profile.workPattern}
                onChange={(e) => patchProfile({ workPattern: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="Stress context">
                <TextArea
                  rows={3}
                  value={state.profile.stressContext}
                  onChange={(e) => patchProfile({ stressContext: e.target.value })}
                />
              </Field>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-ink-soft">
              Health measurements come from the companion mobile app after you pair it from Devices. This website does not read Apple Health, and the mobile app is not available in this build. You can finish onboarding now and connect later.
            </p>
            <div className="rounded-2xl bg-paper p-4">
              <p className="text-sm font-semibold">No device is connected</p>
              <p className="mt-1 text-xs leading-5 text-muted">
                Pairing creates a short-lived code. The mobile app exchanges that code for a device credential. Until then, Today stays empty rather than showing sample readings.
              </p>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="space-y-3 text-sm text-ink-soft">
            <p>Lab upload is optional and not connected to a parser in this version. Today uses stored companion measurements and the check-ins you enter.</p>
          </div>
        );
      case 8:
        return (
          <div className="space-y-3 text-sm text-ink-soft">
            <p>A few recovery questions finish the cold-start profile. You can change these any time.</p>
            <Field label="How have energy and stress felt this week?">
              <TextArea
                rows={3}
                value={state.profile.stressContext}
                onChange={(e) => patchProfile({ stressContext: e.target.value })}
              />
            </Field>
          </div>
        );
      case 9:
        return (
          <div className="space-y-3 text-sm">
            <Field label="Coaching tone">
              <Select
                value={state.profile.coachingTone}
                onChange={(e) =>
                  patchProfile({ coachingTone: e.target.value as "direct" | "gentle" })
                }
              >
                <option value="gentle">Gentle</option>
                <option value="direct">Direct</option>
              </Select>
            </Field>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={state.profile.notifications}
                onChange={(e) => patchProfile({ notifications: e.target.checked })}
              />
              Daily reminder preference. Reminders are not sent in this version.
            </label>
          </div>
        );
      case 10:
        return (
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              {state.profile.displayName || "You"} can keep going. The remaining steps are optional.
              {state.profile.goals.length
                ? ` Goals: ${state.profile.goals.join(", ")}.`
                : " No goals selected yet — you can add them in Profile."}
            </p>
            <p>
              No companion app is connected yet. Today will show unavailable measurements until the mobile app uploads data. Check-ins you enter stay on your account.
            </p>
            <p>HealthTrack explains wellness patterns. It does not diagnose.</p>
          </div>
        );
      case 11:
        return (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-ink-soft">
              Rank the goals you already chose. Order is a personal preference. It does not change the Wellness Tracker weights.
            </p>
            {state.profile.goals.length === 0 ? (
              <div className="grid gap-2">
                {GOAL_OPTIONS.map((goal) => (
                  <button key={goal} type="button" className="rounded-2xl bg-paper px-4 py-3 text-left text-sm font-medium hairline" onClick={() => patchProfile({ goals: [...state.profile.goals, goal] })}>
                    Add {goal}
                  </button>
                ))}
              </div>
            ) : (
              <ol className="space-y-2">
                {state.profile.goals.map((goal, index) => (
                  <li key={goal} className="flex items-center justify-between gap-2 rounded-2xl bg-paper px-3 py-2 text-sm">
                    <span>{index + 1}. {goal}</span>
                    <span className="flex gap-1">
                      <Button variant="ghost" onClick={() => moveGoal(index, -1)} disabled={index === 0}>Up</Button>
                      <Button variant="ghost" onClick={() => moveGoal(index, 1)} disabled={index === state.profile.goals.length - 1}>Down</Button>
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        );
      case 12:
        return (
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-ink-soft">
              Optional notes about where you are starting. These are not measurements and they do not create a Wellness Score.
            </p>
            <Field label="Sleep">
              <TextInput value={state.startingBaselines.sleep} placeholder="Example: about 7 hours" onChange={(event) => patchState({ startingBaselines: { ...state.startingBaselines, sleep: event.target.value } })} />
            </Field>
            <Field label="Activity">
              <TextInput value={state.startingBaselines.activity} placeholder="Example: walks most days" onChange={(event) => patchState({ startingBaselines: { ...state.startingBaselines, activity: event.target.value } })} />
            </Field>
            <Field label="Nutrition">
              <TextInput value={state.startingBaselines.nutrition} placeholder="Example: late dinners" onChange={(event) => patchState({ startingBaselines: { ...state.startingBaselines, nutrition: event.target.value } })} />
            </Field>
            <Field label="Recovery">
              <TextInput value={state.startingBaselines.recovery} placeholder="Example: often tired in the afternoon" onChange={(event) => patchState({ startingBaselines: { ...state.startingBaselines, recovery: event.target.value } })} />
            </Field>
            <p className="text-sm leading-6 text-ink-soft">
              Tracker goals are saved on this account. Skipping this step keeps the suggested 8-hour sleep goal unsaved.
            </p>
            <ScoringGoalsFields
              goals={state.scoringGoals}
              onChange={(scoringGoals) => patchState({ scoringGoals })}
              bedtime={state.profile.typicalBedtime}
              onBedtime={(typicalBedtime) => patchProfile({ typicalBedtime })}
              sleepDisplay={sleepDraft ?? (state.scoringGoals.sleepHoursGoal == null ? "8" : String(state.scoringGoals.sleepHoursGoal))}
              onSleepDisplay={(value) => {
                setSleepDraft(value);
                const hours = Number(value);
                patchState({
                  scoringGoals: {
                    ...state.scoringGoals,
                    sleepHoursGoal: value.trim() === "" || !(hours > 0) ? null : hours,
                  },
                });
              }}
            />
          </div>
        );
      case 13:
        return (
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>Cycle tracking is optional. Leave it off if it does not apply. It does not change the Wellness Tracker.</p>
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={cycleOptIn} onChange={(event) => setCycleOptIn(event.target.checked)} />
              <span>I want cycle tracking available on this account.</span>
            </label>
          </div>
        );
      default:
        return null;
    }
  }

  function moveGoal(index: number, direction: -1 | 1) {
    const goals = [...state.profile.goals];
    const target = index + direction;
    if (target < 0 || target >= goals.length) return;
    const [goal] = goals.splice(index, 1);
    if (!goal) return;
    goals.splice(target, 0, goal);
    patchProfile({ goals });
  }
}
