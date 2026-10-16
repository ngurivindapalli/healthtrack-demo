"use client";

import Link from "next/link";
import { Button, Card, Eyebrow, Field, TextInput } from "@/components/ui";
import { useDemo } from "@/lib/store";

export default function ProfilePage() {
  const { state, patchProfile, resetDemo } = useDemo();
  const connected = state.sources.filter((s) => s.connected).length;

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
        <p className="mt-3 text-sm text-ink-soft">
          Goals: {state.profile.goals.join(" · ") || "None yet"}. Typical bedtime {state.profile.typicalBedtime}.
        </p>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/watch">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Pulse Watch</p>
            <p className="mt-1 text-sm text-ink-soft">
              {state.watch.connected ? "Simulated watch connected" : "Not connected"} · {state.watch.lastSyncAt ? "has sync history" : "never synced"}
            </p>
          </Card>
        </Link>
        <Link href="/profile/devices">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">All data sources</p>
            <p className="mt-1 text-sm text-ink-soft">{connected} simulated sources connected</p>
          </Card>
        </Link>
        <Link href="/profile/labs">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Labs</p>
            <p className="mt-1 text-sm text-ink-soft">{state.labReports.length} parsed reports</p>
          </Card>
        </Link>
        <Link href="/profile/privacy">
          <Card className="h-full hover:bg-paper">
            <p className="font-semibold">Privacy & consent</p>
            <p className="mt-1 text-sm text-ink-soft">Local demo choices, no live identity provider</p>
          </Card>
        </Link>
        <Card>
          <p className="font-semibold">Subscription</p>
          <p className="mt-1 text-sm text-ink-soft">Demo entitlement: HealthTrack 1.0 explorer. Payments are not implemented.</p>
        </Card>
      </div>

      <Card>
        <h2 className="text-base font-semibold">Reset or replay</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Clears browser demo state and restores Ram’s 16 Oct 2026 workspace.
        </p>
        <Button className="mt-3" variant="secondary" onClick={resetDemo}>
          Reset to Ram
        </Button>
      </Card>
    </div>
  );
}
