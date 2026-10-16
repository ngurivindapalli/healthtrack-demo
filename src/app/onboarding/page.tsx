"use client";

import { useRouter } from "next/navigation";
import { Button, Card, Field, Select, TextArea, TextInput } from "@/components/ui";
import { useDemo } from "@/lib/store";
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
  const { state, patchProfile, patchState, setOnboardingStep, completeOnboarding, toggleSource, enterRam } =
    useDemo();
  const step = Math.min(state.onboardingStep, 10);

  function next() {
    if (step >= 10) {
      completeOnboarding();
      router.push("/today");
      return;
    }
    setOnboardingStep(step + 1);
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
          <Button
            variant="ghost"
            onClick={() => {
              enterRam();
              router.push("/today");
            }}
          >
            Skip with Ram’s sample
          </Button>
        </div>
        <p className="text-xs uppercase tracking-[0.14em] text-muted">
          Step {step + 1} of {STEPS.length}
        </p>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-paper-2">
          <div
            className="h-full bg-pine transition-all"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <h1 className="display mt-6 text-3xl">{STEPS[step]}</h1>
        <Card className="mt-5">{renderStep()}</Card>
        <div className="mt-5 flex justify-between">
          <Button variant="secondary" onClick={back}>
            Back
          </Button>
          <Button onClick={next}>{step >= 10 ? "Open Today" : "Continue"}</Button>
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
              HealthTrack learns <em>your</em> normal and helps you improve one
              behavior at a time.
            </p>
            <p>
              Detection without behavior change is just earlier anxiety. This
              onboarding collects only what the 1.0 product needs: goals,
              consent, a thin profile, typical-day context, and optional data
              sources.
            </p>
          </div>
        );
      case 1:
        return (
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">Choose one or more priorities.</p>
            <div className="flex flex-wrap gap-2">
              {GOAL_OPTIONS.map((goal) => {
                const on = state.profile.goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    onClick={() => toggleGoal(goal)}
                    className={`rounded-full px-3 py-1.5 text-sm ${on ? "bg-pine text-surface" : "bg-paper-2 text-ink"}`}
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
            <p className="text-ink-soft">
              This demo stores choices in your browser only. There is no live
              Supabase account.
            </p>
            {(
              [
                ["wearables", "Wearable and health-data access (simulated Junction)"],
                ["labs", "Lab report storage and parsing"],
                ["coaching", "AI Health Coach explanations"],
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
          <div className="space-y-3">
            <p className="text-sm text-ink-soft">
              Junction connections are simulated. Connecting a source loads a labeled sample stream so Today has something to learn from.
            </p>
            {state.sources
              .filter((source) => source.kind !== "manual")
              .map((source) => (
                <div key={source.kind} className="flex items-center justify-between rounded-xl bg-paper px-3 py-2">
                  <div>
                    <p className="text-sm font-medium">{source.label}</p>
                    <p className="text-xs text-muted">{source.permissions.join(" · ")}</p>
                  </div>
                  <Button variant={source.connected ? "secondary" : "primary"} onClick={() => toggleSource(source.kind)}>
                    {source.connected ? "Disconnect" : "Connect"}
                  </Button>
                </div>
              ))}
          </div>
        );
      case 7:
        return (
          <div className="space-y-3 text-sm text-ink-soft">
            <p>Lab upload is optional and can be deferred. You can add a sample parsed report later from Profile.</p>
            <p>Live PDF OCR is not run in this demo. If you continue, Today will use wearables and check-ins only until you add labs.</p>
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
              Daily ONE reminder (demo setting only)
            </label>
          </div>
        );
      default:
        return (
          <div className="space-y-3 text-sm leading-6 text-ink-soft">
            <p>
              Baseline confidence starts at <strong>Building</strong> until enough valid days accumulate. Peer and general references are used conservatively and labeled.
            </p>
            <p>
              On Today you will see My Wellness Status, compact pillar states, and at most one Today’s ONE. Repeat ONE appears only after personal evidence rules are met.
            </p>
            <p>HealthTrack explains wellness patterns. It does not diagnose.</p>
          </div>
        );
    }
  }
}
