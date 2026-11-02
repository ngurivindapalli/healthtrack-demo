"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ScoringGoalsFields } from "@/components/scoring-goals-fields";
import { Button, Card, Eyebrow, Field, TextInput } from "@/components/ui";
import { useDemo } from "@/lib/store";

const GOAL_OPTIONS = [
  "Sleep consistency",
  "Recovery",
  "Metabolic wellness",
  "Steady energy",
  "Sustainable activity",
];

export default function ProfilePage() {
  const router = useRouter();
  const { state, patchProfile, patchState, resetDemo, deleteHealthData } = useDemo();
  const connected = (state.devices ?? []).filter((device) => device.status === "active").length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header>
        <Eyebrow>Profile</Eyebrow>
        <h1 className="display mt-1 text-3xl">Who HealthTrack is learning</h1>
      </header>

      <Card>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Name">
            <TextInput
              value={state.profile.displayName}
              onChange={(e) => patchProfile({ displayName: e.target.value })}
            />
          </Field>
          <Field label="Age">
            <TextInput
              type="number"
              value={state.profile.age}
              onChange={(e) => patchProfile({ age: Number(e.target.value) })}
            />
          </Field>
        </div>
        <Field label="Time zone" hint="Used to place measurements on your local day.">
          <TextInput
            className="mt-3"
            value={state.profile.timezone}
            onChange={(e) => patchProfile({ timezone: e.target.value })}
          />
        </Field>
        <p className="mt-4 text-sm font-medium">Goals</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {GOAL_OPTIONS.map((goal) => {
            const on = state.profile.goals.includes(goal);
            return (
              <button
                key={goal}
                type="button"
                aria-pressed={on}
                onClick={() =>
                  patchProfile({
                    goals: on
                      ? state.profile.goals.filter((item) => item !== goal)
                      : [...state.profile.goals, goal],
                  })
                }
                className={`rounded-full px-3 py-1 text-xs font-medium ${on ? "bg-ink text-surface" : "bg-paper text-ink hairline"}`}
              >
                {goal}
              </button>
            );
          })}
        </div>
        <p className="mt-3 text-sm text-ink-soft">Preference labels do not change the Wellness Tracker weights.</p>
      </Card>

      <Card>
        <p className="font-semibold">Tracker goals</p>
        <p className="mt-1 mb-3 text-sm text-ink-soft">Set the targets used by the Wellness Tracker. You can change these without repeating onboarding.</p>
        <ScoringGoalsFields
          goals={state.scoringGoals}
          onChange={(scoringGoals) => patchState({ scoringGoals })}
          bedtime={state.profile.typicalBedtime}
          onBedtime={(typicalBedtime) => patchProfile({ typicalBedtime })}
        />
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/profile/devices">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Devices & data sources</p>
            <p className="mt-1 text-sm text-ink-soft">
              {connected === 0 ? "No companion app connected" : `${connected} installation${connected === 1 ? "" : "s"} connected`}
            </p>
          </Card>
        </Link>
        <Link href="/profile/labs">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Labs</p>
            <p className="mt-1 text-sm text-ink-soft">
              {state.labReports.length === 0 ? "No reports stored. Parsing is not available." : `${state.labReports.length} stored reports`}
            </p>
          </Card>
        </Link>
        <Link href="/profile/cycle">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Cycle context</p>
            <p className="mt-1 text-sm text-ink-soft">Optional. Off until you opt in, and separate from the Wellness Tracker.</p>
          </Card>
        </Link>
        <a href="/api/v1/me/export">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Export my data</p>
            <p className="mt-1 text-sm text-ink-soft">Download a JSON copy of your profile and saved logs.</p>
          </Card>
        </a>
        <Link href="/profile/privacy">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Privacy & consent</p>
            <p className="mt-1 text-sm text-ink-soft">Account storage, consent, and deletion</p>
          </Card>
        </Link>
        <Card>
          <p className="font-semibold">Subscription</p>
          <p className="mt-1 text-sm text-ink-soft">Payments are not part of this version.</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Account</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Sign out ends this browser session. Deleting health data keeps the account and clears measurements, devices, and profile answers. Deleting the account removes the login as well.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              void resetDemo().then(() => router.push("/"));
            }}
          >
            Sign out
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              if (window.confirm("Delete stored health data for this account?")) {
                void deleteHealthData();
              }
            }}
          >
            Delete health data
          </Button>
          <Button
            variant="secondary"
            onClick={() => {
              const password = window.prompt("Enter your password to delete this account.");
              if (!password) return;
              void fetch("/api/auth/delete-user", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({ password }),
              }).then((response) => {
                if (response.ok) {
                  void resetDemo().then(() => router.push("/"));
                } else window.alert("Account deletion failed. Check the password and try again.");
              });
            }}
          >
            Delete account
          </Button>
        </div>
      </Card>
    </div>
  );
}
